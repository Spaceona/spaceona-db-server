export function saveToLog(text: string) {
  //file name based on date
  const date = new Date();
  const fileName = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.txt`;
  const folder = "./logs";
  const fs = require("fs");

  //check if folder exists
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }

  //save to log in folder
  fs.appendFile(`${folder}/${fileName}`, text + "\n", function (err: any) {
    if (err) console.log(err);
    console.log("saved to log");
  });
}
