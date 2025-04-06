"""
Basic import test for rsazure_openai_toolkit.

This test ensures that the main module and its public functions
can be successfully imported. It is intended to serve as a minimal
CI validation to catch packaging or path-related issues early.
"""

def test_imports():
    try:
        import rsazure_openai_toolkit as rschat
    except ImportError as e:
        assert False, f"Import failed: {e}"
