from flask import Flask, request, jsonify
from transformers import pipeline
import os
import torch

app = Flask(__name__)

MODEL_NAME = os.environ.get('AI_MODEL_NAME', 'google/flan-t5-base')
MAX_LENGTH = int(os.environ.get('AI_MAX_LENGTH', 200))
DEVICE = 0 if torch.cuda.is_available() else -1

print(f'Loading model {MODEL_NAME} on device {DEVICE}...')
pipe = pipeline('text2text-generation', model=MODEL_NAME, device=DEVICE)


def generate_text(prompt: str) -> str:
    outputs = pipe(
        prompt,
        max_new_tokens=MAX_LENGTH,
        do_sample=False,
        truncation=True,
    )

    if not outputs or not isinstance(outputs, list):
        raise ValueError('Unexpected model output')

    first = outputs[0]
    if isinstance(first, dict):
        return (first.get('generated_text') or first.get('text') or '').strip()

    return str(first).strip()


@app.route('/generate', methods=['POST'])
def generate():
    payload = request.get_json(force=True)
    prompt = payload.get('prompt', '')

    if not prompt:
        return jsonify({'error': 'Missing prompt'}), 400

    try:
        result = generate_text(prompt)
        return jsonify({'result': result})
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': MODEL_NAME})


if __name__ == '__main__':
    port = int(os.environ.get('AI_SERVICE_PORT', 5001))
    app.run(host='0.0.0.0', port=port)
