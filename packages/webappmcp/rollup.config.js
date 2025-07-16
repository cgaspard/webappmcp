import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
  // Browser bundle
  {
    input: 'src/browser.ts',
    output: [
      {
        file: 'dist/browser.js',
        format: 'umd',
        name: 'WebAppMCP',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/browser.min.js',
        format: 'umd',
        name: 'WebAppMCP',
        sourcemap: true,
        exports: 'named',
        plugins: [terser()]
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        module: 'esnext'
      })
    ],
    external: []  // Bundle everything for the browser
  },
  // ES Module for modern bundlers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    external: [
      '@modelcontextprotocol/sdk',
      'express',
      'ws', 
      'cors',
      'uuid',
      'yargs',
      'path',
      'fs',
      'net',
      'http',
      'https'
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  }
];