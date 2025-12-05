# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/lib/ai-question-bank/gemini-vision-client.ts')
lines = path.read_text(encoding='utf-8').splitlines()
for idx, line in enumerate(lines, 1):
    if 'Use normalized coordinates' in line:
        print(idx, line.strip())
    if 'Always capture anchor_text_prev' in line:
        print(idx, line.strip())
