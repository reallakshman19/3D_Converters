/** Select the installed interpreter for real subprocess tests; no emulation. */
export const nativeTestPython=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
