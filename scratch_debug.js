const fs = require('fs');
const appPath = './src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const debugCode = `
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error}) {
  return (
    <div role="alert" style={{color: 'red', zIndex: 9999, position: 'absolute', background: 'white', padding: '20px'}}>
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  )
}
`;

content = content.replace("import React", debugCode + "\nimport React");
content = content.replace("<div className=\"viewer-container\">", "<div className=\"viewer-container\">\n<ErrorBoundary FallbackComponent={ErrorFallback}>");
content = content.replace("<ThreeViewer", "<ThreeViewer");
content = content.replace("</ThreeViewer></div>", "</ThreeViewer></ErrorBoundary></div>"); // wait, self-closing tag

fs.writeFileSync(appPath + '.bak', content);
