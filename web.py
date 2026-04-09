import sys

from app.web import create_app

app = create_app()

if __name__ == "__main__":
    port = 5000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    app.run(host="0.0.0.0", port=port, debug=True)
