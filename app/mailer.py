import smtplib
from email.message import EmailMessage

from app.config import settings


def smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def send_email(to_email: str, subject: str, body: str) -> None:
    if not smtp_configured():
        raise RuntimeError("El correo SMTP no está configurado.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
