#!/bin/sh
# Installs the latest Studigo release:
#   curl -fsSL https://raw.githubusercontent.com/Nestorservice/studigo/master/install.sh | sh
# macOS: Studigo.app into /Applications. Linux (x86_64): the AppImage as ~/.local/bin/studigo.
set -eu

repo="https://github.com/Nestorservice/studigo"
tag=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "$repo/releases/latest")
tag=${tag##*/}
version=${tag#v}
case $version in [0-9]*) ;; *) echo "Could not find the latest Studigo release." >&2; exit 1 ;; esac

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

case "$(uname -s)" in
Darwin)
  case "$(uname -m)" in arm64) arch=aarch64 ;; *) arch=x64 ;; esac
  echo "Downloading Studigo $version ($arch)..."
  curl -fL --progress-bar -o "$tmp/studigo.dmg" "$repo/releases/download/$tag/Studigo_${version}_${arch}.dmg"
  hdiutil attach -nobrowse -quiet -mountpoint "$tmp/mnt" "$tmp/studigo.dmg"
  rm -rf /Applications/Studigo.app
  ditto "$tmp/mnt/Studigo.app" /Applications/Studigo.app
  hdiutil detach -quiet "$tmp/mnt"
  # The app is not notarized yet; curl adds no quarantine flag, but clear it in case.
  xattr -dr com.apple.quarantine /Applications/Studigo.app 2>/dev/null || true
  echo "Installed /Applications/Studigo.app"
  ;;
Linux)
  [ "$(uname -m)" = x86_64 ] || { echo "Studigo for Linux is only built for x86_64." >&2; exit 1; }
  dir="$HOME/.local/bin"
  mkdir -p "$dir"
  echo "Downloading Studigo $version..."
  curl -fL --progress-bar -o "$tmp/studigo" "$repo/releases/download/$tag/Studigo_${version}_amd64.AppImage"
  chmod +x "$tmp/studigo"
  mv "$tmp/studigo" "$dir/studigo"
  echo "Installed $dir/studigo (run: studigo). The AppImage needs FUSE 2 (libfuse2)."
  case ":$PATH:" in *":$dir:"*) ;; *) echo "Add $dir to your PATH to run it by name." ;; esac
  ;;
*)
  echo "On Windows, download the installer from $repo/releases/latest" >&2
  exit 1
  ;;
esac
