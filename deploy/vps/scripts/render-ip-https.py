"""Add an IP TLS virtual host while retaining the existing named hosts/routes."""
import ipaddress
import re
import subprocess
import sys
from pathlib import Path


def blocks(text):
    result = []
    for match in re.finditer(r"(?m)^\s*server\s*\{", text):
        depth = 1
        end = match.end()
        while depth:
            if end >= len(text):
                raise ValueError("Unbalanced nginx server block")
            depth += (text[end] == "{") - (text[end] == "}")
            end += 1
        result.append((match.start(), end, text[match.start():end]))
    return result


def render(text, address, certificate_names):
    ipaddress.IPv4Address(address)
    servers = blocks(text)
    http = next((body for _, _, body in servers if re.search(r"listen\s+80(?:\s|;)", body)), None)
    if http is None or "location /api/" not in http:
        raise ValueError("Expected the existing single-host HTTP routing configuration")
    replacements = []
    for start, end, body in servers:
        names = re.search(r"server_name\s+([^;]+);", body)
        if names and names.group(1).strip() == address and re.search(r"listen\s+443", body):
            replacements.append((start, end, ""))
            continue
        if re.search(r"listen\s+443", body):
            body = re.sub(r"(listen\s+443[^;]*?)\s+default_server", r"\1", body)
            if names and names.group(1).strip() == "_":
                certificate = re.search(r"ssl_certificate\s+([^;]+);", body)
                aliases = certificate_names.get(certificate.group(1), []) if certificate else []
                if not aliases:
                    raise ValueError("Cannot retain the existing wildcard TLS host without its certificate DNS names")
                body = re.sub(r"server_name\s+_;", "server_name " + " ".join(aliases) + ";", body)
            replacements.append((start, end, body))
    for start, end, body in reversed(replacements):
        text = text[:start] + body + text[end:]
    tls = re.sub(r"listen\s+80[^;]*;", "listen 443 ssl default_server;", http)
    tls = re.sub(r"server_name\s+[^;]+;", f"server_name {address};\n  ssl_certificate /etc/letsencrypt/live/dos-ip/fullchain.pem;\n  ssl_certificate_key /etc/letsencrypt/live/dos-ip/privkey.pem;", tls)
    return text.rstrip() + "\n\n" + tls.strip() + "\n"


def main():
    source, destination, address, certificate_root = sys.argv[1:]
    text = Path(source).read_text()
    names = {}
    for certificate in re.findall(r"ssl_certificate\s+([^;]+);", text):
        relative = Path(certificate).relative_to("/etc/letsencrypt")
        output = subprocess.check_output(["openssl", "x509", "-in", str(Path(certificate_root) / relative), "-noout", "-ext", "subjectAltName"], text=True)
        names[certificate] = re.findall(r"DNS:([A-Za-z0-9.*_-]+)", output)
    Path(destination).write_text(render(text, address, names))


if __name__ == "__main__":
    main()
