import tempfile
import os
from io import BytesIO
from datetime import datetime
from pylatex import Document, Command, Center
from pylatex.utils import NoEscape, bold
from pylatex.table import Tabularx
from fastapi import HTTPException

# Email sending utility (Flask-Mail)
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


import logging
import asyncio


logger = logging.getLogger("mealplanner.email")
logging.basicConfig(level=logging.DEBUG)


async def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Async send email using SMTP. Logs debug info for troubleshooting.
    """
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    from_email = os.environ.get("FROM_EMAIL") or smtp_user
    logger.debug(
        f"Preparing to send email: to={to_email}, subject={subject}, smtp_server={smtp_server}, smtp_port={smtp_port}, smtp_user={smtp_user}, from_email={from_email}"
    )
    if not smtp_user or not smtp_password or not from_email:
        logger.error("SMTP credentials not configured.")
        raise HTTPException(status_code=500, detail="SMTP credentials not configured.")
    msg = MIMEMultipart()
    msg["From"] = str(from_email)
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: _send_smtp(
                smtp_server,
                smtp_port,
                smtp_user,
                smtp_password,
                from_email,
                to_email,
                msg,
            ),
        )
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")


def _send_smtp(
    smtp_server, smtp_port, smtp_user, smtp_password, from_email, to_email, msg
):
    import logging
    import smtplib

    logger = logging.getLogger("mealplanner.email")
    logger.debug(f"Connecting to SMTP server {smtp_server}:{smtp_port}")
    if int(smtp_port) == 465:

        logger.debug("Using SMTP_SSL for port 465")
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            logger.debug("Connected via SMTP_SSL")
            server.login(smtp_user, smtp_password)
            logger.debug("Logged in to SMTP server")
            server.sendmail(str(from_email), to_email, msg.as_string())
            logger.debug(f"Sent email to {to_email}")
    else:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            logger.debug("Connected via SMTP (STARTTLS)")
            server.starttls()
            server.login(smtp_user, smtp_password)
            logger.debug("Logged in to SMTP server")
            server.sendmail(str(from_email), to_email, msg.as_string())
            logger.debug(f"Sent email to {to_email}")


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
