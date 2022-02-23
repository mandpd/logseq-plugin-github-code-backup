import axios from 'axios';
import '@logseq/libs';

// Github API Data TODO: Move to plugin settings
const decode = (str: string):string => Buffer.from(str, 'base64').toString('binary');
const contents = "/contents/";


/**
 * File Types that are recognized on import
 **/
 export enum CodeType {
  typescript = "typescript",
  javascript = "js",
  html = "html",
  error = "error",
  php = "php",
  md = "markdown",
  notebook = "ipynb",
  julia = "julia",
  R = "R",
  python = "python",
  yaml = "yaml",
  docker = "dockerfile",
  tsreact = "typescript"
}

/**
 * Extensions that correspond to the supported file types
 **/
const CodeTypes = [
  {
    ext: "js",
    type: CodeType.javascript,
  },
  {
    ext: "ts",
    type: CodeType.typescript,
  },
  {
    ext: "html",
    type: CodeType.html,
  },
  {
    ext: "php",
    type: CodeType.php,
  },
  {
    ext: "md",
    type: CodeType.md,
  },
  {
    ext: "ipynb",
    type: CodeType.notebook,
  },
  {
    ext: "jl",
    type: CodeType.julia,
  },
  {
    ext: "R",
    type: CodeType.R,
  },
  {
    ext: "py",
    type: CodeType.python,
  },
  {
    ext: "yml",
    type: CodeType.yaml,
  },
  {
    ext: "dockerfile",
    type: CodeType.docker
  },
  {
    ext: "tsx",
    type: CodeType.tsreact
  }
];

/**
 * Internal structure for passing code file contents
 */
interface CodeFile {
  content: string;
  type: CodeType | undefined;
}

/**
 *
 * @param filePath
 * @returns Promise for the codefile structure for the requested file.
 *
 * Attempts to retrieve the requested file from VS code via the live server on port 5500.
 */

export async function getFile(filePath: string): Promise<CodeFile> {
  
  //Retrieve github settings
  const githubURL = "https://api.github.com/repos/" + logseq!.settings!.githubAccount + "/";
  let repo = logseq!.settings!.githubRepo ? logseq!.settings!.githubRepo : "";
  const token = logseq!.settings!.githubPat;
  try {
    // Parse filePath for repo name
    const parts = filePath.split(':');
    if(parts.length == 2) {
        repo = parts[0];
        filePath = parts[1];
    }
    // Abort if no repo provided
    if(repo == "") {
      logseq.App.showMsg(`No repository name provided.`,'error');
      return {
        content: "No repository name provided",
        type: CodeType.error,
      };
    }
    
    const endpoint = githubURL + repo + contents + filePath;
    console.log(endpoint); //TODO: Remove
    //TODO check for Windows style folder delimiters
    let bits = filePath.split(".");
    if (bits.length == 1) {
      return {
        content: "No Delimiter",
        type: CodeType.error,
      };
    }
    const fileType = bits[bits.length - 1];
    let response = await axios.get(endpoint, { headers: {
      'Authorization': `token ${token}`
      }});
    
    let myText = decode(response.data.content);
    myText.replace(/\n/g, "\r");
    return {
      content: myText,
      type: CodeTypes.find((c) => {
        return c.ext == fileType;
      })?.type,
    };
  } catch (err) {
    if ((err.message = "Failed to fetch")) {
      logseq.App.showMsg(
        `The file was not found. Github is case sensitive so check the case of the path you provided.`, 'error'
      );
      return {
        content: err.message,
        type: CodeType.error,
      };
    } else {
      logseq.App.showMsg(`error is ${err.message}`,'error');
      return {
        content: err.message,
        type: CodeType.error,
      };
    }
  }
}
