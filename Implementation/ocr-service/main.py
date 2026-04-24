from fastapi import FastAPI
from pydantic import BaseModel
import pytesseract
from PIL import Image, ImageFilter, ImageOps
import re
from pdf2image import convert_from_path
import os
import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
OCR_CONFIG = "--oem 3 --psm 6"

app = FastAPI()


class FileInput(BaseModel):
    file_path: str


class ReconcileInput(BaseModel):
    gstr1_path: str
    gstr3b_path: str


def normalize_ocr_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.replace("\x0c", " ")
    cleaned = cleaned.replace("₹", " Rs ")
    cleaned = cleaned.replace("—", "-").replace("–", "-")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def preprocess_image(pil_image: Image.Image) -> Image.Image:
    # Preferred path: grayscale -> denoise -> threshold with OpenCV.
    if cv2 is not None and np is not None:
        np_image = np.array(pil_image.convert("RGB"))
        gray = cv2.cvtColor(np_image, cv2.COLOR_RGB2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, 12, 7, 21)
        thresholded = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
        )
        return Image.fromarray(thresholded)

    # Fallback if cv2/numpy is unavailable.
    gray = ImageOps.grayscale(pil_image)
    denoised = gray.filter(ImageFilter.MedianFilter(size=3))
    return denoised.point(lambda p: 255 if p > 160 else 0)


def ocr_from_image(pil_image: Image.Image) -> str:
    processed = preprocess_image(pil_image)
    raw_text = pytesseract.image_to_string(processed, config=OCR_CONFIG)
    return normalize_ocr_text(raw_text)


def extract_text(file_path: str) -> str:
    text_parts: List[str] = []
    file_path = file_path.replace("\\", "/")

    if file_path.lower().endswith(".pdf"):
        pages = convert_from_path(file_path, dpi=300)
        for idx, page_img in enumerate(pages, start=1):
            page_text = ocr_from_image(page_img)
            if page_text:
                text_parts.append(f"[PAGE {idx}] {page_text}")
    else:
        with Image.open(file_path) as img:
            text = ocr_from_image(img)
            if text:
                text_parts.append(text)

    return normalize_ocr_text(" ".join(text_parts))


def find_gstin(text: str) -> Optional[str]:
    cleaned = re.sub(r"[^0-9A-Za-z]", "", text or "").upper()
    match = re.search(r"\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]", cleaned)
    return match.group(0) if match else None


def find_date(text: str) -> Optional[str]:
    patterns = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}\b",
        r"\b[A-Za-z]{3,9}\s+\d{1,2},\s*\d{2,4}\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)
    return None


def find_invoice_number(text: str) -> Optional[str]:
    patterns = [
        r"(?:invoice|inv)\s*(?:no|num|number)\s*[:#\-\s]*([A-Z0-9][A-Z0-9/_\-]{2,})",
        r"(?:bill|doc(?:ument)?)\s*(?:no|num|number)\s*[:#\-\s]*([A-Z0-9][A-Z0-9/_\-]{2,})",
        r"\bIRN\s*[:#\-\s]*([A-Z0-9][A-Z0-9/_\-]{5,})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def find_amount(text: str) -> Optional[str]:
    patterns = [
        r"(?:total\s*(?:amount)?|grand\s*total|taxable\s*value|net\s*payable|amount)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
        r"(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    ]
    candidates: List[str] = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if not matches:
            continue
        if isinstance(matches[0], tuple):
            candidates.extend(m[-1] for m in matches if m and m[-1])
        else:
            candidates.extend(matches)

    normalized_numbers = []
    for value in candidates:
        clean_value = str(value).replace(",", "")
        try:
            normalized_numbers.append((float(clean_value), clean_value))
        except ValueError:
            continue

    if not normalized_numbers:
        return None

    # Prefer the highest amount; tiny OCR artifacts like "1" become less likely.
    normalized_numbers.sort(key=lambda item: item[0], reverse=True)
    return normalized_numbers[0][1]


def find_sections(text: str) -> List[str]:
    sections = re.findall(r"(?:section|sec\.?)\s*([0-9]{1,3}[A-Z]?)", text, re.IGNORECASE)
    seen = set()
    ordered: List[str] = []
    for sec in sections:
        key = sec.upper()
        if key not in seen:
            seen.add(key)
            ordered.append(key)
    return ordered


def infer_notice_type(text: str) -> str:
    lowered = text.lower()
    if "drc-01" in lowered or "demand" in lowered:
        return "Demand Notice"
    if "asmt-10" in lowered or "scrutiny" in lowered:
        return "Scrutiny Notice"
    if "mismatch" in lowered:
        return "Mismatch Notice"
    if "invoice" in lowered:
        return "Invoice"
    return "Unknown"


def parse_text(text: str) -> Dict[str, Any]:
    return {
        "gstin": find_gstin(text),
        "date": find_date(text),
        "invoice_number": find_invoice_number(text),
        "amount": find_amount(text),
        "notice_type": infer_notice_type(text),
        "sections": find_sections(text),
    }


def key_fields_missing(parsed: Dict[str, Any]) -> bool:
    keys = ["gstin", "date", "invoice_number", "amount"]
    present = sum(1 for key in keys if parsed.get(key))
    return present < 2


def llm_fallback_parse(text: str) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    prompt = (
        "Extract GST notice details from OCR text and return only valid JSON with keys: "
        "gstin, date, invoice_number, amount, notice_type, sections. "
        "Use null for unknown values, [] for sections.\n\nOCR text:\n"
        + text[:12000]
    )

    payload = {
        "model": os.getenv("OCR_LLM_MODEL", "gpt-4o-mini"),
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "You are a GST notice information extractor."},
            {"role": "user", "content": prompt},
        ],
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
        raw = body["choices"][0]["message"]["content"]
        parsed = json.loads(raw)
        return {
            "gstin": parsed.get("gstin"),
            "date": parsed.get("date"),
            "invoice_number": parsed.get("invoice_number"),
            "amount": parsed.get("amount"),
            "notice_type": parsed.get("notice_type") or "Unknown",
            "sections": parsed.get("sections") or [],
        }
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, json.JSONDecodeError):
        return None


def reconcile_records(gstr1: Dict[str, Any], gstr3b: Dict[str, Any]) -> Dict[str, Any]:
    mismatches: List[Dict[str, Any]] = []
    fields = ["gstin", "amount", "date", "invoice_number"]
    for field in fields:
        g1 = gstr1.get(field)
        g3 = gstr3b.get(field)
        if g1 and g3 and str(g1).strip() != str(g3).strip():
            severity = "high" if field in {"gstin", "amount"} else "medium"
            mismatches.append(
                {
                    "field": field,
                    "gstr1_value": g1,
                    "gstr3b_value": g3,
                    "severity": severity,
                }
            )

    if any(item["severity"] == "high" for item in mismatches):
        status = "critical"
    elif mismatches:
        status = "review"
    else:
        status = "matched"

    summary = {
        "total_mismatches": len(mismatches),
        "high_severity": sum(1 for x in mismatches if x["severity"] == "high"),
        "medium_severity": sum(1 for x in mismatches if x["severity"] == "medium"),
    }

    return {
        "status": "success",
        "reconciliation_status": status,
        "mismatches": mismatches,
        "summary": summary,
    }


@app.post("/parse-notice")
def parse_notice(data: FileInput):
    if not os.path.exists(data.file_path):
        return {"error": "File not found"}

    text = extract_text(data.file_path)
    parsed = parse_text(text)

    if key_fields_missing(parsed):
        llm_parsed = llm_fallback_parse(text)
        if llm_parsed:
            for key in ["gstin", "date", "invoice_number", "amount", "notice_type", "sections"]:
                if not parsed.get(key):
                    parsed[key] = llm_parsed.get(key)

    return parsed


@app.post("/reconcile-gstr")
def reconcile_gstr(data: ReconcileInput):
    if not os.path.exists(data.gstr1_path):
        return {"status": "error", "message": "GSTR-1 file not found"}
    if not os.path.exists(data.gstr3b_path):
        return {"status": "error", "message": "GSTR-3B file not found"}

    gstr1_text = extract_text(data.gstr1_path)
    gstr3b_text = extract_text(data.gstr3b_path)
    gstr1_parsed = parse_text(gstr1_text)
    gstr3b_parsed = parse_text(gstr3b_text)
    return reconcile_records(gstr1_parsed, gstr3b_parsed)