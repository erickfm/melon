"""Static file server for Melon. Local: python3 server.py -> http://localhost:8000"""
import os
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.after_request
def revalidate(resp):
    # iOS Safari caches ES modules hard; make it check ETags every load
    resp.headers['Cache-Control'] = 'no-cache'
    return resp


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)), debug=True)
