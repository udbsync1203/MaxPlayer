import "./style.css";
import "./app.css";

import { Hello } from "../wailsjs/go/main/App";

document.querySelector("#app").innerHTML = `
  <div id="result">Loading...</div>
`;

let resultElement = document.getElementById("result");

// Сразу вызываем метод при загрузке
Hello()
  .then((result) => {
    resultElement.innerText = result;
  })
  .catch((err) => {
    console.error(err);
    resultElement.innerText = "Error";
  });
