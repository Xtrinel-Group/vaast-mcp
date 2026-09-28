# Security Policy

## Security Model

### Read-Only by Design

The VAAST MCP server provides **read-only** access to local scan data. It exposes no tools for:
- Launching scans
- Installing or uninstalling Xtensions
- Deleting workspaces or findings
- Modifying any VAAST configuration

### Local-Only Network Binding

The VAAST MCP server binds exclusively to `127.0.0.1` (localhost). It is **never accessible** from your local network or the internet. All MCP traffic stays on your machine.

### Bearer Token Authentication

Each time VAAST's MCP server starts, it generates a cryptographically random bearer token (32 bytes, base64-encoded). This token is:
- Written to `~/.vaast/mcp.json` with restricted file permissions
- Required on every request
- Regenerated on each server restart

### DNS Rebinding Defense

The VAAST MCP server validates `Host` and `Origin` headers, rejecting any requests that don't originate from `127.0.0.1` or `localhost`.

### Data Scope

The MCP server returns only:
- This user's local SQLite data (workspaces, findings, scans)
- This user's registered targets (fetched from Xtrinel API with the user's auth token)

No cross-user data leakage is possible.

## Reporting a Vulnerability

If you discover a security issue in VAAST or the MCP server, please report it to:

**security@xtrinel.com**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

We'll respond within 72 hours and coordinate disclosure timelines with you.

## Supported Versions

Security updates are provided for:
- The latest stable release of VAAST
- The latest version of `@xtrinel/vaast-mcp`

## Known Limitations

### Localhost Trust Boundary

The MCP server assumes all traffic from `127.0.0.1` is trustworthy. If an attacker has local code execution on your machine, they can read the bearer token from `~/.vaast/mcp.json` and access your VAAST data.

This is by design: MCP servers are intended for local AI assistants, not remote clients.

### No Server-Side Shutdown

Once started, the VAAST MCP server cannot be fully stopped without restarting the entire VAAST application. The port remains bound until VAAST exits. This is a known limitation of the current Axum integration.

## Best Practices

1. **Only start the MCP server when actively using it** with an AI assistant.
2. **Don't share `~/.vaast/mcp.json`** or its contents. The bearer token grants full read access to your VAAST data.
3. **Keep VAAST and `@xtrinel/vaast-mcp` up to date** to receive security patches.

## Contact

- Email: security@xtrinel.com
- Website: https://xtrinel.com
