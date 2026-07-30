from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def create_contact_sheets(source: Path, output: Path, prefix: str) -> None:
    pages = sorted(source.glob("*.png"))
    if not pages:
        raise ValueError(f"No PNG pages found in {source}")
    output.mkdir(parents=True, exist_ok=True)
    columns = 3
    rows = 4
    thumb_width = 260
    label_height = 24
    gap = 14
    per_sheet = columns * rows

    for sheet_index in range(math.ceil(len(pages) / per_sheet)):
        selected = pages[sheet_index * per_sheet : (sheet_index + 1) * per_sheet]
        with Image.open(selected[0]) as sample:
            ratio = sample.height / sample.width
        thumb_height = round(thumb_width * ratio)
        canvas = Image.new(
            "RGB",
            (
                columns * thumb_width + (columns + 1) * gap,
                rows * (thumb_height + label_height) + (rows + 1) * gap,
            ),
            "white",
        )
        draw = ImageDraw.Draw(canvas)
        for index, page_path in enumerate(selected):
            row, column = divmod(index, columns)
            x = gap + column * (thumb_width + gap)
            y = gap + row * (thumb_height + label_height + gap)
            with Image.open(page_path) as page:
                page.thumbnail((thumb_width, thumb_height))
                canvas.paste(page.convert("RGB"), (x, y))
            draw.text((x, y + thumb_height + 4), page_path.stem, fill="black")
        destination = output / f"{prefix}-{sheet_index + 1:02d}.png"
        canvas.save(destination, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: create_contact_sheets.py <page-dir> <output-dir> <prefix>"
        )
    create_contact_sheets(
        Path(sys.argv[1]).resolve(),
        Path(sys.argv[2]).resolve(),
        sys.argv[3],
    )
