"""
Minimal PDF generator for text-based exports without external dependencies.
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, List


def _pdf_safe_text(text: str) -> str:
    latin = text.encode("latin-1", "replace").decode("latin-1")
    return latin.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_text_pdf(title: str, lines: Iterable[str]) -> bytes:
    """
    Build a single-page PDF document with a title and multiple text lines.
    This intentionally keeps formatting simple for operational exports.
    """
    y = 800
    rendered: List[str] = []
    rendered.append("BT")
    rendered.append("/F1 14 Tf")
    rendered.append(f"50 {y} Td")
    rendered.append(f"({_pdf_safe_text(title)}) Tj")

    rendered.append("/F1 9 Tf")
    rendered.append("0 -18 Td")
    rendered.append(
        f"(Generated at {datetime.utcnow().isoformat(timespec='seconds')} UTC) Tj"
    )

    for raw in lines:
        y -= 13
        if y < 60:
            break
        rendered.append("0 -13 Td")
        rendered.append(f"({_pdf_safe_text(str(raw))}) Tj")
    rendered.append("ET")

    content_stream = "\n".join(rendered).encode("latin-1", "replace")

    objects: List[bytes] = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    )
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append(
        f"<< /Length {len(content_stream)} >>\nstream\n".encode("latin-1")
        + content_stream
        + b"\nendstream"
    )

    output = bytearray()
    output.extend(b"%PDF-1.4\n")
    offsets: List[int] = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{idx} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        output.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    output.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )
    return bytes(output)

