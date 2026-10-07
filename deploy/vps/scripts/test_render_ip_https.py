import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("render_ip_https", Path(__file__).with_name("render-ip-https.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RenderIpHttpsTest(unittest.TestCase):
    def test_preserves_domain_certificate_and_routes_and_sets_ip_default(self):
        http = Path(__file__).parents[1].joinpath("nginx/templates/single-host.conf.example").read_text()
        domain = http.replace("listen 80 default_server;", "listen 443 ssl http2 default_server;").replace("server_name _;", "server_name _;\n ssl_certificate /etc/letsencrypt/live/domain/fullchain.pem;\n ssl_certificate_key /etc/letsencrypt/live/domain/privkey.pem;")
        aliases = {"/etc/letsencrypt/live/domain/fullchain.pem": ["dos.example.com"]}
        result = module.render(http + domain, "89.126.200.51", aliases)
        self.assertEqual(result.count("listen 443 ssl default_server;"), 1)
        self.assertIn("server_name dos.example.com;", result)
        self.assertIn("server_name 89.126.200.51;", result)
        self.assertEqual(result.count("location /api/"), 3)
        self.assertEqual(result.count("location /passenger/"), 3)
        self.assertIn("/live/domain/privkey.pem", result)
        self.assertIn("/live/dos-ip/privkey.pem", result)
        self.assertEqual(module.render(result, "89.126.200.51", aliases), result)

    def test_http_redirect_is_not_copied_to_ip_tls_host(self):
        routes = Path(__file__).parents[1].joinpath("nginx/templates/single-host.conf.example").read_text()
        domain = routes.replace("listen 80 default_server;", "listen 443 ssl default_server;").replace("server_name _;", "server_name dos.example.com;\n ssl_certificate /etc/letsencrypt/live/domain/fullchain.pem;\n ssl_certificate_key /etc/letsencrypt/live/domain/privkey.pem;")
        http = "server { listen 80; server_name _; location /api/ {} location / { return 301 https://$host$request_uri; } }\n"
        previous_ip = "server { listen 443 ssl default_server; server_name 89.126.200.51; location / { return 301 https://$host$request_uri; } }\n"
        result = module.render(http + domain + previous_ip, "89.126.200.51", {})
        ip_host = module.blocks(result)[-1][2]
        self.assertNotIn("return 301", ip_host)
        self.assertIn("proxy_pass http://admin:3001", ip_host)
        self.assertEqual(ip_host.count("ssl_certificate "), 1)
        self.assertEqual(ip_host.count("ssl_certificate_key "), 1)
        self.assertEqual(module.render(result, "89.126.200.51", {}), result)

    def test_rejects_redirect_only_template(self):
        with self.assertRaisesRegex(ValueError, "HTTPS redirect"):
            module.render("server { listen 80; server_name _; location /api/ {} return 301 https://$host$request_uri; }", "89.126.200.51", {})

    def test_rejects_unknown_domain_names_before_overwriting_configuration(self):
        with self.assertRaises(ValueError):
            module.render("server { listen 80; location /api/ {} }\nserver { listen 443 ssl default_server; server_name _; }", "89.126.200.51", {})
