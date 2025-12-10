/**
 * 骨架代码模板
 * 提供可执行的 Python 绘图代码，减少 LLM 生成错误的概率。
 */

import type { GenerationParameters } from './types';

type TemplateBuilder = (params: GenerationParameters) => {
  questionText: string;
  pythonCode: string;
  coordinates: Record<string, [number, number] | number[]>;
};

const linearTemplate: TemplateBuilder = (params) => {
  const a = Number((params as any).coef_a ?? 1);
  const b = Number((params as any).coef_b ?? 0);
  const domain = (params as any).domain ?? [-10, 10];
  const xIntercept = a !== 0 ? -b / a : 0;

  const questionText = `已知函数 f(x) = ${a}x + ${b}，请在区间 [${domain[0]}, ${domain[1]}] 作图并标注截距。`;

  const pythonCode = `
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
import json

def generate_diagram():
    a = ${a}
    b = ${b}
    x = np.linspace(${domain[0]}, ${domain[1]}, 400)
    y = a * x + b

    fig, ax = plt.subplots(figsize=(8, 6), dpi=150)
    ax.plot(x, y, 'b-', linewidth=2, label=f'f(x) = {a}x + {b}')

    ax.plot(0, b, 'ro', markersize=8, label='y截距')
    ax.annotate(f'(0, {b})', xy=(0, b), xytext=(10, 10), textcoords='offset points', fontsize=10, color='red')

    if a != 0:
        xi = -b / a
        ax.plot(xi, 0, 'go', markersize=8, label='x截距')
        ax.annotate(f'({xi:.2f}, 0)', xy=(xi, 0), xytext=(10, -20), textcoords='offset points', fontsize=10, color='green')

    ax.axhline(0, color='k', linewidth=0.5)
    ax.axvline(0, color='k', linewidth=0.5)
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend(loc='best', fontsize=9)
    ax.set_title('线性函数图像')

    png_buffer = BytesIO()
    plt.savefig(png_buffer, format='png', bbox_inches='tight')
    png_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')

    svg_buffer = BytesIO()
    plt.savefig(svg_buffer, format='svg', bbox_inches='tight')
    svg_base64 = base64.b64encode(svg_buffer.getvalue()).decode('utf-8')

    plt.close(fig)
    return {"png": png_base64, "svg": svg_base64}
`.trim();

  const coordinates = {
    y_intercept: [0, b],
    x_intercept: [xIntercept, 0],
  };

  return { questionText, pythonCode, coordinates };
};

const quadraticTemplate: TemplateBuilder = (params) => {
  const a = Number((params as any).coef_a ?? 1);
  const b = Number((params as any).coef_b ?? 0);
  const c = Number((params as any).coef_c ?? 0);
  const domain = (params as any).domain ?? [-10, 10];
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;

  const questionText = `已知二次函数 f(x) = ${a}x^2 + ${b}x + ${c}，请在区间 [${domain[0]}, ${domain[1]}] 作图并标注顶点与截距。`;

  const pythonCode = `
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
import math
import json

def generate_diagram():
    a = ${a}
    b = ${b}
    c = ${c}
    x = np.linspace(${domain[0]}, ${domain[1]}, 400)
    y = a * x * x + b * x + c

    fig, ax = plt.subplots(figsize=(8, 6), dpi=150)
    ax.plot(x, y, 'b-', linewidth=2, label=f'f(x) = {a}x^2 + {b}x + {c}')

    vx = -b / (2 * a)
    vy = a * vx * vx + b * vx + c
    ax.plot(vx, vy, 'ro', markersize=9, label='顶点')
    ax.axvline(vx, color='purple', linestyle='--', linewidth=1.2, label=f'对称轴 x={vx:.2f}')

    ax.plot(0, c, 'go', markersize=8, label='y截距')
    delta = b*b - 4*a*c
    if delta >= 0 and a != 0:
        x1 = (-b + math.sqrt(delta)) / (2*a)
        x2 = (-b - math.sqrt(delta)) / (2*a)
        ax.plot([x1, x2], [0, 0], 'mo', markersize=8, label='x截距')

    ax.axhline(0, color='k', linewidth=0.5)
    ax.axvline(0, color='k', linewidth=0.5)
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.legend(loc='best', fontsize=9)
    ax.set_title('二次函数图像')

    png_buffer = BytesIO()
    plt.savefig(png_buffer, format='png', bbox_inches='tight')
    png_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')

    svg_buffer = BytesIO()
    plt.savefig(svg_buffer, format='svg', bbox_inches='tight')
    svg_base64 = base64.b64encode(svg_buffer.getvalue()).decode('utf-8')

    plt.close(fig)
    return {"png": png_base64, "svg": svg_base64}
`.trim();

  const coordinates: Record<string, [number, number] | number[]> = {
    vertex: [vx, vy],
    y_intercept: [0, c],
  };
  return { questionText, pythonCode, coordinates };
};

const histogramTemplate: TemplateBuilder = (params) => {
  const sampleSize = Number((params as any).sample_size ?? 50);
  const seed = Number((params as any).random_seed ?? 42);
  const domain = (params as any).domain ?? [-10, 10];
  const questionText = `生成 ${sampleSize} 个随机样本并绘制直方图，区间 [${domain[0]}, ${domain[1]}]。`;

  const pythonCode = `
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
import json

def generate_diagram():
    np.random.seed(${seed})
    data = np.random.normal(loc=0, scale=1, size=${sampleSize})
    fig, ax = plt.subplots(figsize=(8,6), dpi=150)
    ax.hist(data, bins=20, color='skyblue', edgecolor='black')
    ax.set_title('直方图')
    ax.set_xlabel('值')
    ax.set_ylabel('频数')
    ax.grid(True, alpha=0.3, linestyle='--')

    png_buffer = BytesIO()
    plt.savefig(png_buffer, format='png', bbox_inches='tight')
    png_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')

    svg_buffer = BytesIO()
    plt.savefig(svg_buffer, format='svg', bbox_inches='tight')
    svg_base64 = base64.b64encode(svg_buffer.getvalue()).decode('utf-8')

    plt.close(fig)
    return {"png": png_base64, "svg": svg_base64}
`.trim();

  const coordinates = {};
  return { questionText, pythonCode, coordinates };
};

const barTemplate: TemplateBuilder = (params) => {
  const questionText = `生成分类条形图并标注频数。`;
  const pythonCode = `
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
import json

def generate_diagram():
    labels = ['A','B','C','D']
    values = [12, 7, 15, 9]
    fig, ax = plt.subplots(figsize=(8,6), dpi=150)
    ax.bar(labels, values, color='teal')
    for i,v in enumerate(values):
        ax.text(i, v + 0.5, str(v), ha='center', fontsize=9)
    ax.set_xlabel('类别')
    ax.set_ylabel('频数')
    ax.set_title('条形图')
    ax.grid(True, axis='y', alpha=0.3, linestyle='--')

    png_buffer = BytesIO()
    plt.savefig(png_buffer, format='png', bbox_inches='tight')
    png_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')

    svg_buffer = BytesIO()
    plt.savefig(svg_buffer, format='svg', bbox_inches='tight')
    svg_base64 = base64.b64encode(svg_buffer.getvalue()).decode('utf-8')

    plt.close(fig)
    return {"png": png_base64, "svg": svg_base64}
`.trim();
  return { questionText, pythonCode, coordinates: {} };
};

const triangleTemplate: TemplateBuilder = (params) => {
  const questionText = `绘制三角形并标注顶点。`;
  const pythonCode = `
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
import json

def generate_diagram():
    A = np.array([0, 0])
    B = np.array([3, 0])
    C = np.array([1.5, 2.5])
    xs = [A[0], B[0], C[0], A[0]]
    ys = [A[1], B[1], C[1], A[1]]

    fig, ax = plt.subplots(figsize=(6,6), dpi=150)
    ax.plot(xs, ys, 'b-', linewidth=2)
    ax.scatter([A[0], B[0], C[0]], [A[1], B[1], C[1]], color='red')
    for pt, name in zip([A,B,C], ['A','B','C']):
        ax.annotate(name, (pt[0], pt[1]), textcoords='offset points', xytext=(5,5))
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.axhline(0, color='k', linewidth=0.5)
    ax.axvline(0, color='k', linewidth=0.5)

    png_buffer = BytesIO()
    plt.savefig(png_buffer, format='png', bbox_inches='tight')
    png_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')

    svg_buffer = BytesIO()
    plt.savefig(svg_buffer, format='svg', bbox_inches='tight')
    svg_base64 = base64.b64encode(svg_buffer.getvalue()).decode('utf-8')

    plt.close(fig)
    return {"png": png_base64, "svg": svg_base64}
`.trim();

  const coordinates = {
    A: [0, 0],
    B: [3, 0],
    C: [1.5, 2.5],
  };
  return { questionText, pythonCode, coordinates };
};

const circleTemplate: TemplateBuilder = (params) => {
  const questionText = `绘制圆并标注圆心与半径。`;
  const pythonCode = `
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
import json

def generate_diagram():
    center = (0,0)
    r = 2
    theta = np.linspace(0, 2*np.pi, 200)
    x = center[0] + r * np.cos(theta)
    y = center[1] + r * np.sin(theta)

    fig, ax = plt.subplots(figsize=(6,6), dpi=150)
    ax.plot(x, y, 'b-', linewidth=2, label='圆')
    ax.scatter([center[0]], [center[1]], color='red', label='圆心')
    ax.annotate('O', center, textcoords='offset points', xytext=(5,5))
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.axhline(0, color='k', linewidth=0.5)
    ax.axvline(0, color='k', linewidth=0.5)
    ax.set_xlim(-3,3)
    ax.set_ylim(-3,3)
    ax.legend(loc='best', fontsize=9)

    png_buffer = BytesIO()
    plt.savefig(png_buffer, format='png', bbox_inches='tight')
    png_base64 = base64.b64encode(png_buffer.getvalue()).decode('utf-8')

    svg_buffer = BytesIO()
    plt.savefig(svg_buffer, format='svg', bbox_inches='tight')
    svg_base64 = base64.b64encode(svg_buffer.getvalue()).decode('utf-8')

    plt.close(fig)
    return {"png": png_base64, "svg": svg_base64}
`.trim();

  const coordinates = {
    center: [0, 0],
    radius: [2, 0],
  };
  return { questionText, pythonCode, coordinates };
};

/**
 * 获取骨架模板
 */
export function getCodeTemplate(
  questionType: string,
  diagramType: string,
  params: GenerationParameters
) {
  if (questionType === 'function') {
    if (diagramType === 'linear') return linearTemplate(params);
    if (diagramType === 'quadratic') return quadraticTemplate(params);
  }
  if (questionType === 'statistics') {
    if (diagramType === 'histogram') return histogramTemplate(params);
    if (diagramType === 'bar') return barTemplate(params);
  }
  if (questionType === 'geometry') {
    if (diagramType === 'triangle') return triangleTemplate(params);
    if (diagramType === 'circle') return circleTemplate(params);
  }
  return null;
}
