import tempfile
import os
from io import BytesIO
from datetime import datetime
from pylatex import Document, Command, Center
from pylatex.utils import NoEscape, bold
from pylatex.table import Tabularx
from fastapi import HTTPException


def create_pdf_in_memory(plan: dict) -> bytes:
    """
    Generates a PDF meal plan with meals as rows and days as columns.
    Fixes text overflow and adds a timestamp.
    """
    # Use a temporary directory to avoid file conflicts
    with tempfile.TemporaryDirectory() as temp_dir:
        filepath = os.path.join(temp_dir, "meal_plan")

        # 1. Setup document in PORTRAIT mode
        # Increased horizontal margin slightly to give columns more breathing room
        geometry_options = {"tmargin": "2cm", "lmargin": "2cm"}
        doc = Document(filepath, geometry_options=geometry_options)

        # 2. Add necessary LaTeX packages and a title with a timestamp
        doc.preamble.append(Command("usepackage", "tabularx"))
        doc.preamble.append(Command("usepackage", "array"))

        with doc.create(Center()):
            # Main title
            doc.append(NoEscape(r"\Large\textbf{Weekly Meal Plan}"))
            doc.append(NoEscape(r"\\*[0.2cm]"))  # Add a small vertical space

            # Timestamp
            timestamp = datetime.now().strftime("%d %B %Y at %H:%M:%S")
            doc.append(NoEscape(r"\normalsize Generated on " + timestamp))

        doc.append(NoEscape(r"\vspace{0.5cm}"))

        # 3. Define the structure and start a smaller font size environment
        doc.append(NoEscape(r"\small"))
        days_order = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        meals_order = ["pre_breakfast", "breakfast", "lunch", "dinner", "snack"]

        # 4. Create the Tabularx table with the overflow fix
        # CHANGE: The X column is now preceded by a command to make text ragged-right
        column_spec = ">{\\bfseries}l|" + "|".join(
            [">{\\raggedright\\arraybackslash}X" for _ in days_order]
        )

        with doc.create(
            Tabularx(column_spec, width_argument=NoEscape(r"\linewidth"))
        ) as table:
            # Header Row
            header = ["Meal Type"] + [day[:3] for day in days_order]
            table.add_row(header, mapper=[bold])
            table.add_hline()

            # Add Data Rows
            for meal in meals_order:
                meal_name = meal.replace("_", " ").title()
                row = [meal_name]

                for day in days_order:
                    items = plan.get(day, {}).get(meal, [])
                    cell_text = "\n".join(items)
                    row.append(cell_text)

                table.add_row(row)
                table.add_hline()

        # 5. Generate the PDF
        try:
            doc.generate_pdf(clean_tex=True)
        except Exception as e:
            print(f"Error during PDF generation: {e}")
            raise HTTPException(
                status_code=500, detail="Could not generate PDF from LaTeX."
            )

        # Read the generated PDF file into memory as bytes
        pdf_path = filepath + ".pdf"
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

    return pdf_bytes
