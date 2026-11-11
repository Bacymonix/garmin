#!/usr/bin/env python3
"""Assemble index.html à partir de src/ (aucune dépendance)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
js = '\n'.join((src / f).read_text(encoding='utf-8') for f in ['seed.js', 'engine.js', 'analytics.js', 'movements.js', 'coach.js', 'ui.js', 'views.js', 'views2.js', 'cloud.js', 'garmin.js']).replace("'use strict';", "")
html = (src / 'shell.html').read_text(encoding='utf-8').replace('/*SCRIPTS*/', "'use strict';\n" + js.replace('</script', '<\\/script'))
(root / 'index.html').write_text(html, encoding='utf-8')
print('index.html', len(html), 'octets')
