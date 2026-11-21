import os
import subprocess
import base64
import tempfile
import shutil
import glob
from flask import Blueprint, request, jsonify

presentation_upload_bp = Blueprint('presentation_upload', __name__)

LIBREOFFICE_PATH = r"C:\Program Files\LibreOffice\program\soffice.exe"

@presentation_upload_bp.route('/api/presentation/upload-preview', methods=['POST'])
def upload_preview():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in ['ppt', 'pptx']:
        return jsonify({'error': 'Only .ppt and .pptx files supported'}), 400

    if not os.path.exists(LIBREOFFICE_PATH):
        return jsonify({
            'error': f'LibreOffice not found at {LIBREOFFICE_PATH}. Please install from libreoffice.org'
        }), 500

    tmp_dir = tempfile.mkdtemp()
    try:
        input_path = os.path.join(tmp_dir, file.filename)
        file.save(input_path)
        print(f'Saved uploaded file: {input_path}')

        # STEP 1: Convert PPTX -> PDF (preserves ALL slides)
        result = subprocess.run([
            LIBREOFFICE_PATH,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', tmp_dir,
            input_path
        ], capture_output=True, text=True, timeout=120)

        print(f'LibreOffice PDF stdout: {result.stdout}')
        print(f'LibreOffice PDF stderr: {result.stderr}')

        if result.returncode != 0:
            return jsonify({'error': f'PDF conversion failed: {result.stderr}'}), 500

        base_name = os.path.splitext(file.filename)[0]
        pdf_path = os.path.join(tmp_dir, f'{base_name}.pdf')

        if not os.path.exists(pdf_path):
            pdfs = glob.glob(os.path.join(tmp_dir, '*.pdf'))
            if not pdfs:
                return jsonify({'error': 'PDF was not generated'}), 500
            pdf_path = pdfs[0]

        print(f'PDF generated at: {pdf_path}')

        # STEP 2: Convert each PDF page -> PNG using PyMuPDF (no poppler needed)
        import fitz  # PyMuPDF

        doc = fitz.open(pdf_path)
        print(f'PDF has {doc.page_count} pages')

        slides = []
        zoom = 100 / 72  # ~150 DPI
        matrix = fitz.Matrix(zoom, zoom)

        for i in range(doc.page_count):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=matrix)
            png_path = os.path.join(tmp_dir, f'slide_{i}.png')
            pix.save(png_path)

            with open(png_path, 'rb') as f:
                img_base64 = base64.b64encode(f.read()).decode('utf-8')
            slides.append({
                'index': i,
                'image': f'data:image/png;base64,{img_base64}',
                'title': f'Slide {i + 1}'
            })

        doc.close()
        print(f'Successfully converted {len(slides)} slides')

        return jsonify({
            'slides': slides,
            'total': len(slides),
            'filename': file.filename
        })

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Conversion timed out (>120s)'}), 500
    except Exception as e:
        print(f'Exception: {e}')
        return jsonify({'error': str(e)}), 500
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)