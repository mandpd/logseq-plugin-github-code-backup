import axios from "axios";
import "@logseq/libs";

// Github API Data TODO: Move to plugin settings
const decode = (str: string): string =>
  Buffer.from(str, "base64").toString("binary");
const contents = "/contents/";
let commit_id = '';

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
  tsreact = "typescript",
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
    type: CodeType.docker,
  },
  {
    ext: "tsx",
    type: CodeType.tsreact,
  },
];

/**
 * Internal structure for passing code file contents
 */
interface CodeFile {
  content: string;
  type: CodeType | undefined;
  commit_id?: string;
}

interface CommitListEntry {
  id: string;
  message: string;
}

interface RepoListEntry {
  name: string;
  description: string;
}

let repoCommitsList: { reponame: string, commits: CommitListEntry[] }[] = [];
/**
 *
 * @param filePath
 * @returns Promise for the codefile structure for the requested file.
 *
 * Attempts to retrieve the requested file from VS code via the live server on port 5500.
 */

export async function getFile(filePath: string): Promise<CodeFile> {
  //Retrieve github settings
  const githubURL =
    "https://api.github.com/repos/" + logseq!.settings!.githubAccount + "/";
  let repo = logseq!.settings!.githubRepo ? logseq!.settings!.githubRepo : "";
  const token = logseq!.settings!.githubPat;
  try {
    // Parse filePath for repo name
    const parts = filePath.split(":");
    if (parts.length == 2) {
      repo = parts[0];
      filePath = parts[1];
    }
    // Abort if no repo provided
    if (repo == "") {
      logseq.App.showMsg(`No repository name provided.`, "error");
      return {
        content: "No repository name provided",
        type: CodeType.error,
      };
    }


    getCommits(repo);

    // Update commit_if
    commit_id = '?ref=' + repoCommitsList.find(rcl => { return rcl.reponame == repo })?.commits[0].id;

    const endpoint = githubURL + repo + contents + filePath + commit_id;
    console.log(`get file endpoint is ${endpoint}`); //TODO: Remove
    //TODO check for Windows style folder delimiters
    let bits = filePath.split(".");
    if (bits.length == 1) {
      return {
        content: "No Delimiter",
        type: CodeType.error,
      };
    }
    const fileType = bits[bits.length - 1];
    let response = await axios.get(endpoint, {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    // console.log(`response is: ${JSON.stringify(response)}`);
    let myText = decode(response.data.content);
    myText.replace(/\n/g, "\r");
    return {
      content: myText,
      type: CodeTypes.find((c) => {
        return c.ext == fileType;
      })?.type,
      commit_id: response.data.url.split('=').pop()
    };
  } catch (err) {
    if ((err.message = "Failed to fetch")) {
      logseq.App.showMsg(
        `The file was not found. Github is case sensitive so check the case of the path you provided.`,
        "error"
      );
      return {
        content: err.message,
        type: CodeType.error,
      };
    } else {
      logseq.App.showMsg(`error is ${err.message}`, "error");
      return {
        content: err.message,
        type: CodeType.error,
      };
    }
  }
}

export async function getRepos(): Promise<RepoListEntry[]> {
  //Retrieve github settings
  const endpoint = "https://api.github.com/user/repos?per_page=100";
  const token = logseq!.settings!.githubPat;

  console.log(endpoint); //TODO: Remove

  let response = await axios.get(endpoint, {
    headers: {
      Authorization: `token ${token}`,
    },
  });
  const repoList: RepoListEntry[] = [];
  response.data.forEach((repo) => {
    repoList.push({
      name: repo.name,
      description: repo.description,
    });
  });
  console.log(`repos object is ${JSON.stringify(repoList)}`);
  return repoList;
}

export async function getCommits(filePath: string): Promise<void> {
  //Retrieve github settings
  const githubURL =
    "https://api.github.com/repos/" + logseq!.settings!.githubAccount + "/";
  let repo = logseq!.settings!.githubRepo ? logseq!.settings!.githubRepo : "";
  const token = logseq!.settings!.githubPat;

  // Parse filePath for repo name
  const parts = filePath.split(":");
  if (parts.length == 2) {
    repo = parts[0];
    filePath = parts[1];
  }
  // Abort if no repo provided
  if (repo == "") {
    logseq.App.showMsg(`No repository name provided.`, "error");
    return;
  }

  // Check if the commit list already exists
  let arIndex = repoCommitsList.findIndex(a => { return a.reponame == repo});
  // TODO: Options on when to refresh/persist commits
  
  //Update commit list
  const endpoint = githubURL + repo + "/commits";
  // console.log(endpoint); //TODO: Remove

  let response = await axios.get(endpoint, {
    headers: {
      Authorization: `token ${token}`,
    },
  });
  const commitList: { reponame: string, commits: CommitListEntry[] } = { reponame: repo, commits: []};
  response.data.forEach((commit) => {
    commitList.commits.push({
      message: commit.commit.message,
      id: commit.url.split("/").pop(),
    });
  });
  console.log(`commits object is ${JSON.stringify(commitList)}`);

  // Add or Update
  if(arIndex >= 0) {
    repoCommitsList[arIndex] = commitList;
  } else {
    repoCommitsList.push(commitList);
  }
 
  return;
}
