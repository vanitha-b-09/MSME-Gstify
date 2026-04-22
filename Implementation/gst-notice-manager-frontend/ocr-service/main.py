from fastapi import FastAPI
from pydantic import BaseModel
import pytesseract
from PIL import Image
import re
from pdf2image import convert_from_path
import os

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

app = FastAPI()

class FileInput(BaseModel):
    file_path: str

def extract_text(file_path):
    text = ""
    file_path = file_path.replace("\\", "/")

    if file_path.endswith(".pdf"):
        images = convert_from_path(file_path)
        for img in images:
            text += pytesseract.image_to_string(img)
    else:
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)

    return text

def find_gstin(text: str):
    # OCR often introduces spaces/punctuation or lower-case letters. Normalize first.
    cleaned = re.sub(r"[^0-9A-Za-z]", "", text or "").upper()
    m = re.search(r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b", cleaned)
    return m.group(0) if m else None

def parse_text(text):
    gstin = find_gstin(text)

    # Support multiple date formats
    date = re.search(r"\b\d{2}[-/]\d{2}[-/]\d{4}\b", text)
    if not date:
        date = re.search(r"\b\w+\s\d{1,2},\s\d{4}\b", text)  # October 20, 2063

    # Invoice number
    invoice_no = re.search(r"Invoice\s*Number[:\s]*([A-Za-z0-9]+)", text, re.IGNORECASE)

    # Amount
    amount = re.search(r"Total\s*Amount.*?\$?([\d,]+\.\d{2})", text, re.IGNORECASE)

    sections = re.findall(r"Section\s*(\d+)", text)

    notice_type = "Unknown"
    if "invoice" in text.lower():
        notice_type = "Invoice"
    elif "mismatch" in text.lower():
        notice_type = "Mismatch Notice"
    elif "demand" in text.lower():
        notice_type = "Demand Notice"

    return {
        "gstin": gstin,
        "date": date.group() if date else None,
        "invoice_number": invoice_no.group(1) if invoice_no else None,
        "amount": amount.group(1) if amount else None,
        "notice_type": notice_type,
        "sections": sections
    }

@app.post("/parse-notice")
def parse_notice(data: FileInput):
    if not os.path.exists(data.file_path):
        return {"error": "File not found"}

    text = extract_text(data.file_path)
    return parse_text(text)