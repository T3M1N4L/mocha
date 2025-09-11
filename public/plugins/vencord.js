if (body.includes("<head>")) {
  const vencord = `<script src="https://raw.githubusercontent.com/Vencord/builds/main/browser.js"></script>
                        <link rel="stylesheet" href="https://raw.githubusercontent.com/Vencord/builds/main/browser.css">
                        `;

  let modifiedBody = body.replace("<head>", "<head>" + vencord);

  return modifiedBody;
}
return body;
