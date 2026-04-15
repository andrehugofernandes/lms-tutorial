import os

from lms_backend import create_app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("BACKEND_PORT", "5328")),
        debug=os.getenv("FLASK_DEBUG", "1") == "1",
    )
