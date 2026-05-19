import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", "20150"))
    reload = os.getenv("UVICORN_RELOAD", "1") == "1"
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
