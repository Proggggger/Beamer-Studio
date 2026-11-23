export interface CodeLanguageOption {
  id: string;
  label: string;
  /** Listings dialect name; omitted means plain monospaced output. */
  dialect?: string;
}

export const CODE_LANGUAGES: CodeLanguageOption[] = [
  { id: 'text', label: 'Plain text' },
  { id: 'python', label: 'Python', dialect: 'Python' },
  { id: 'c', label: 'C', dialect: 'C' },
  { id: 'cpp', label: 'C++', dialect: 'C++' },
  { id: 'java', label: 'Java', dialect: 'Java' },
  { id: 'javascript', label: 'JavaScript (plain)' },
  { id: 'typescript', label: 'TypeScript (plain)' },
  { id: 'csharp', label: 'C# (plain)' },
  { id: 'html', label: 'HTML', dialect: 'HTML' },
  { id: 'xml', label: 'XML', dialect: 'XML' },
  { id: 'css', label: 'CSS (plain)' },
  { id: 'json', label: 'JSON (plain)' },
  { id: 'yaml', label: 'YAML (plain)' },
  { id: 'sql', label: 'SQL', dialect: 'SQL' },
  { id: 'bash', label: 'Bash', dialect: 'bash' },
  { id: 'powershell', label: 'PowerShell (plain)' },
  { id: 'latex', label: 'LaTeX', dialect: 'TeX' },
  { id: 'matlab', label: 'MATLAB', dialect: 'Matlab' },
  { id: 'r', label: 'R', dialect: 'R' },
  { id: 'perl', label: 'Perl', dialect: 'Perl' },
  { id: 'ruby', label: 'Ruby', dialect: 'Ruby' },
  { id: 'pascal', label: 'Pascal', dialect: 'Pascal' },
  { id: 'haskell', label: 'Haskell', dialect: 'Haskell' },
  { id: 'lisp', label: 'Lisp', dialect: 'Lisp' },
  { id: 'fortran', label: 'Fortran', dialect: 'Fortran' },
  { id: 'verilog', label: 'Verilog', dialect: 'Verilog' },
  { id: 'vhdl', label: 'VHDL', dialect: 'VHDL' },
];

const ALIASES: Record<string, string> = {
  plain: 'text',
  plaintext: 'text',
  txt: 'text',
  py: 'python',
  'c++': 'cpp',
  cxx: 'cpp',
  js: 'javascript',
  node: 'javascript',
  ts: 'typescript',
  cs: 'csharp',
  shell: 'bash',
  sh: 'bash',
  zsh: 'bash',
  tex: 'latex',
  rstats: 'r',
  vb: 'text',
};

export function validCodeLang(value: unknown): string {
  if (typeof value !== 'string') return 'text';
  const raw = value.trim().toLowerCase();
  const id = ALIASES[raw] ?? raw;
  return CODE_LANGUAGES.some((entry) => entry.id === id) ? id : 'text';
}

export function codeLanguage(id: string): CodeLanguageOption {
  return CODE_LANGUAGES.find((entry) => entry.id === id) ?? CODE_LANGUAGES[0];
}

export const CODE_TAB_SIZE = 4;

/**
 * Listings prints raw tabs as `^^I`, so tabs are expanded to fixed stops like
 * an editor would. Preview and export share this conversion.
 */
export function expandCodeTabs(text: string): string {
  if (!text.includes('\t')) return text;
  return text
    .split('\n')
    .map((line) => {
      if (!line.includes('\t')) return line;
      let column = 0;
      let out = '';
      for (const char of line) {
        if (char === '\t') {
          const width = CODE_TAB_SIZE - (column % CODE_TAB_SIZE);
          out += ' '.repeat(width);
          column += width;
        } else {
          out += char;
          column += 1;
        }
      }
      return out;
    })
    .join('\n');
}

export function listingsDialect(id: string): string | undefined {
  return codeLanguage(id).dialect;
}
