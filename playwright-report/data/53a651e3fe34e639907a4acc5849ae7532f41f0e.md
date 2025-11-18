# Page snapshot

```yaml
- generic [active]:
  - alert [ref=e1]
  - dialog "Server Error" [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e8]:
          - button "previous" [disabled] [ref=e9]:
            - img "previous" [ref=e10]
          - button "next" [disabled] [ref=e12]:
            - img "next" [ref=e13]
          - generic [ref=e15]: 1 of 1 error
          - generic [ref=e16]:
            - text: Next.js (14.2.7) is outdated
            - link "(learn more)" [ref=e18] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - heading "Server Error" [level=1] [ref=e19]
        - paragraph [ref=e20]: "ReferenceError: require is not defined in ES module scope, you can use import instead This file is being treated as an ES module because it has a '.js' file extension and 'D:\\rixinwork\\Rixindemo-codex-m1\\package.json' contains \"type\": \"module\". To treat it as a CommonJS script, rename it to use the '.cjs' file extension."
        - generic [ref=e21]: This error happened while generating the page. Any console logs will be displayed in the terminal window.
      - generic [ref=e22]:
        - heading "Call Stack" [level=2] [ref=e23]
        - generic [ref=e24]:
          - heading "<unknown>" [level=3] [ref=e25]
          - generic [ref=e27]: file:///D:/rixinwork/Rixindemo-codex-m1/.next/server/pages/_document.js (60:27)
        - generic [ref=e28]:
          - heading "<unknown>" [level=3] [ref=e29]
          - generic [ref=e31]: file:///D:/rixinwork/Rixindemo-codex-m1/.next/server/pages/_document.js (66:3)
        - generic [ref=e32]:
          - heading "TracingChannel.traceSync" [level=3] [ref=e33]
          - generic [ref=e35]: node:diagnostics_channel (328:14)
        - group [ref=e36]:
          - generic "Next.js" [ref=e37] [cursor=pointer]:
            - img [ref=e38]
            - img [ref=e40]
            - text: Next.js
```