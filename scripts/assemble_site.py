"""Assemble and validate the complete, publishable Night Floor artifact."""

from argparse import ArgumentParser
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
VITE_OUTPUT = ROOT / "studio" / "dist"
ARTIFACT = ROOT / "dist"

# The Vite homepage is the artifact's index.html. Everything below is an
# explicitly approved, tracked dependency of that homepage or a case study.
STATIC_FILES = (
    ".nojekyll",
    "404.html",
    "benchmark.js",
    "case.css",
    "cuda-data.js",
    "cuda.js",
    "motion.css",
    "motion.js",
    "robots.txt",
    "sitemap.xml",
    "styles.css",
)
STATIC_TREES = ("assets", "work")
REQUIRED_FILES = (
    "index.html",
    "404.html",
    ".nojekyll",
    "assets/Hajar-Mrifag-CV.pdf",
    "assets/favicon.svg",
    "work/skyquery.html",
    "work/gridflex.html",
    "work/neobank.html",
    "work/aegis.html",
    "work/cuda.html",
    "work/sourced.html",
    "styles.css",
    "case.css",
    "motion.css",
    "motion.js",
    "benchmark.js",
    "cuda.js",
    "cuda-data.js",
    "robots.txt",
    "sitemap.xml",
)
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)


class ArtifactPage(HTMLParser):
    def __init__(self, path: Path):
        super().__init__()
        self.path = path
        self.refs: list[str] = []
        self.ids: set[str] = set()
        self.h1s = 0
        self.errors: list[str] = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.add(attributes["id"])
        if tag == "h1":
            self.h1s += 1
        for key in ("href", "src"):
            if attributes.get(key):
                self.refs.append(attributes[key])
        if tag == "img" and "alt" not in attributes:
            self.errors.append(f"{self.path.name}: image without alt text")


def relative_files(directory: Path) -> set[Path]:
    if not directory.is_dir():
        return set()
    return {
        path.relative_to(directory)
        for path in directory.rglob("*")
        if path.is_file()
    }


def tracked_static_files() -> set[Path]:
    command = ["git", "ls-files", "-z", "--", *STATIC_FILES, *STATIC_TREES]
    result = subprocess.run(command, cwd=ROOT, check=True, capture_output=True)
    files = {
        Path(item.decode("utf-8"))
        for item in result.stdout.split(b"\0")
        if item
    }
    missing_entries = set(map(Path, STATIC_FILES)) - files
    if missing_entries:
        missing = ", ".join(sorted(map(str, missing_entries)))
        raise RuntimeError(f"Required static files are not tracked: {missing}")
    for path in files:
        source = ROOT / path
        if not source.is_file() or source.is_symlink():
            raise RuntimeError(f"Static source must be a tracked regular file: {path}")
    return files


def expected_files() -> tuple[set[Path], set[Path], set[Path]]:
    vite_files = relative_files(VITE_OUTPUT)
    if Path("index.html") not in vite_files:
        raise RuntimeError("Vite output is missing index.html; run the studio build first.")
    static_files = tracked_static_files()
    collisions = vite_files & static_files
    if collisions:
        names = ", ".join(sorted(map(str, collisions)))
        raise RuntimeError(f"Vite/static output collision: {names}")
    return vite_files | static_files, vite_files, static_files


def safe_artifact_path(path: Path) -> Path:
    resolved = path.resolve()
    if resolved.parent != ROOT.resolve() or resolved.name != "dist":
        raise RuntimeError(f"Refusing to replace unexpected output directory: {resolved}")
    return resolved


def copy_files(files: set[Path], source_root: Path, destination_root: Path) -> None:
    for relative in sorted(files):
        source = source_root / relative
        destination = destination_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def resolve_reference(page: Path, reference: str, artifact: Path) -> Path | None:
    parts = urlsplit(reference)
    if parts.scheme or parts.netloc:
        return None
    decoded = unquote(parts.path)
    if not decoded:
        return page
    if decoded.startswith("/"):
        target = artifact / decoded.lstrip("/")
    else:
        target = page.parent / decoded
    target = target.resolve()
    if target.is_dir():
        target /= "index.html"
    return target


def validate_artifact(expected: set[Path]) -> None:
    artifact = safe_artifact_path(ARTIFACT)
    if not artifact.is_dir():
        raise RuntimeError("Artifact directory does not exist; run npm run build:site first.")

    actual = relative_files(artifact)
    missing = expected - actual
    unexpected = actual - expected
    errors: list[str] = []
    if missing:
        errors.append("Missing artifact files: " + ", ".join(sorted(map(str, missing))))
    if unexpected:
        errors.append("Unexpected artifact files: " + ", ".join(sorted(map(str, unexpected))))
    for required in map(Path, REQUIRED_FILES):
        if required not in actual:
            errors.append(f"Missing required artifact path: {required}")

    index = artifact / "index.html"
    if index.is_file():
        index_text = index.read_text(encoding="utf-8")
        for development_path in ("/src/", "./src/", "/@vite/"):
            if development_path in index_text:
                errors.append(f"Built homepage contains development path: {development_path}")

    pages = {
        path.resolve(): ArtifactPage(path)
        for path in artifact.rglob("*.html")
        if path.is_file()
    }
    references = 0
    for path, page in pages.items():
        if page.h1s != 1:
            errors.append(f"{path.relative_to(artifact)}: expected one h1, got {page.h1s}")
        errors.extend(page.errors)
        for reference in page.refs:
            target = resolve_reference(path, reference, artifact)
            if target is None:
                continue
            references += 1
            if not target.is_relative_to(artifact):
                errors.append(
                    f"{path.relative_to(artifact)}: link leaves artifact: {reference}"
                )
            elif not target.is_file():
                errors.append(
                    f"{path.relative_to(artifact)}: missing local file: {reference}"
                )
            elif urlsplit(reference).fragment and target.suffix == ".html":
                fragment = unquote(urlsplit(reference).fragment)
                target_page = pages.get(target.resolve())
                if target_page is None or fragment not in target_page.ids:
                    errors.append(
                        f"{path.relative_to(artifact)}: missing fragment: {reference}"
                    )

    for stylesheet in artifact.rglob("*.css"):
        text = stylesheet.read_text(encoding="utf-8")
        for _, reference in CSS_URL.findall(text):
            if not reference or reference.startswith(("data:", "#")):
                continue
            target = resolve_reference(stylesheet, reference, artifact)
            if target is None:
                continue
            references += 1
            if not target.is_relative_to(artifact) or not target.is_file():
                errors.append(
                    f"{stylesheet.relative_to(artifact)}: missing local CSS asset: {reference}"
                )

    if errors:
        raise RuntimeError("\n".join(errors))

    total_bytes = sum((artifact / path).stat().st_size for path in actual)
    print(
        f"Validated complete artifact: {len(actual)} files, {len(pages)} pages, "
        f"{references} local references, {total_bytes} bytes."
    )


def assemble() -> None:
    expected, vite_files, static_files = expected_files()
    artifact = safe_artifact_path(ARTIFACT)
    if artifact.exists():
        shutil.rmtree(artifact)
    artifact.mkdir()
    copy_files(vite_files, VITE_OUTPUT, artifact)
    copy_files(static_files, ROOT, artifact)
    validate_artifact(expected)
    print(
        f"Assembled {artifact} from {len(vite_files)} Vite files and "
        f"{len(static_files)} tracked static files."
    )


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate the existing artifact without replacing it.",
    )
    args = parser.parse_args()
    try:
        if args.check_only:
            expected, _, _ = expected_files()
            validate_artifact(expected)
        else:
            assemble()
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
