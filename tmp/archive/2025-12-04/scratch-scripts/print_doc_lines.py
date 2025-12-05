# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('docs/rixinmath-coarse-to-fine-interface.md')
lines = path.read_text(encoding='utf-8').splitlines()
for idx, line in enumerate(lines, 1):
    if idx <= 20 or '模块实施路线' in line:
        print(idx, line)
