import version_sort from "version-sort";

type ReleaseInfo = {
  releases?: {
    [version: string]: {
      filename: string,
      boards: string[],
    },
  };

  nightly?: {
    date: string,
    version: string,
    filename: string,
    boards: string[],
  }
};

let data: ReleaseInfo = {};

const baseUrl = "https://passinglink.github.io/passinglink";

export async function fetchReleases() : Promise<void> {
  const response = await fetch(`${baseUrl}/releases.json`);
  data = await response.json()! as ReleaseInfo;
}

export function getReleases() : Array<string> {
  if (!("releases" in data)) {
    return [];
  }
  return version_sort(Object.keys(data.releases!));
}

export function getNightlyDate() : string {
  return data.nightly!.date;
}

export function getNightlyVersion() : string {
  return data.nightly!.version;
}

export async function downloadRelease(release: string, board: string): Promise<ArrayBuffer> {
  let info;

  if (release == "nightly") {
    info = data.nightly!;
  } else {
    if (!(release in data.releases!)) {
      throw `Release ${release} doesn't exist?`;
    }

    info = data.releases![release]!;
  }

  if (!info.boards.includes(board)) {
    throw `Release ${release} doesn't exist for board ${board}`;
  }

  const url = `${baseUrl}/${board}/${info.filename}`;
  console.log(`Fetching URL "${url}"...`);

  const response = await fetch(url);
  const blob = await response.blob();
  console.log("Downloaded " + blob.size + " bytes");
  return blob.arrayBuffer();
}
