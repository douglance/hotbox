import { createElement } from 'react';
import { Box, Text, useStdout } from 'ink';

export interface HotboxUIProps {
  nodeVersion: string;
  cpus: string;
  mem: string;
  pids: string;
  port: string;
  noNetwork: boolean;
  logs: string[];
}

const fireColors = ['#e06c75', '#f77f00', '#ffa500', '#ffc800'];
const flames = ['▁▂', '▂▃', '▃▄', '▄▅', '▅▆', '▆▇', '▇█'];

export function HotboxUI({ nodeVersion, cpus, mem, pids, port, noNetwork, logs }: HotboxUIProps) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 120;
  const statusBoxWidth = 45;
  const logBoxWidth = termWidth - statusBoxWidth - 3;

  // Calculate fire frame based on timestamp (no state updates)
  const frameIndex = Math.floor(Date.now() / 200) % flames.length;
  const fireColor = fireColors[frameIndex % fireColors.length];
  const flame = flames[frameIndex];

  // Take last N logs to fit terminal height
  const termHeight = stdout?.rows || 30;
  const maxLogs = termHeight - 3;
  const displayLogs = logs.slice(-maxLogs);

  return createElement(Box, { flexDirection: "row", width: termWidth },
    createElement(Box, { flexDirection: "column", width: statusBoxWidth, borderStyle: "round", borderColor: "#f77f00", paddingX: 1 },
      createElement(Box, { justifyContent: "center", marginBottom: 1 },
        createElement(Text, { bold: true },
          createElement(Text, { color: fireColor }, flame),
          ' ',
          createElement(Text, { color: "#f77f00" }, ' HOTBOX'),
          ' ',
          createElement(Text, { color: fireColor }, flame)
        )
      ),
      createElement(Box, { marginBottom: 1 },
        createElement(Text, { dimColor: true }, ' Container   '),
        createElement(Text, { color: "#61afef" }, `node:${nodeVersion}-alpine`)
      ),
      createElement(Box, { marginBottom: 1 },
        createElement(Text, { dimColor: true }, ' Resources   '),
        createElement(Text, { color: "#e5c07b" }, cpus),
        createElement(Text, null, ' CPU  '),
        createElement(Text, { color: "#e5c07b" }, mem),
        createElement(Text, null, '  '),
        createElement(Text, { color: "#e5c07b" }, pids),
        createElement(Text, null, ' PIDs')
      ),
      createElement(Box, { marginBottom: 1 },
        createElement(Text, { dimColor: true }, ' Network     '),
        noNetwork ?
          createElement(Text, { color: "#e5c07b" }, ' off') :
          createElement(Text, { color: "#98c379" }, ' enabled')
      ),
      createElement(Box, { marginBottom: 1 },
        createElement(Text, { dimColor: true }, ' Security    '),
        createElement(Text, { color: "#98c379" }, 'read-only')
      ),
      createElement(Box, { marginTop: 1, borderStyle: "single", borderColor: "#f77f00", paddingX: 1 },
        createElement(Text, { bold: true, color: "#f77f00" }, `http://localhost:${port}`)
      ),
      createElement(Box, { marginTop: "auto" },
        createElement(Text, { dimColor: true }, 'Press Ctrl+C to stop')
      )
    ),
    createElement(Box, { flexDirection: "column", width: logBoxWidth, borderStyle: "round", borderColor: "#5c6370", paddingX: 1, marginLeft: 1 },
      createElement(Box, { borderBottom: true, borderColor: "#5c6370", marginBottom: 1 },
        createElement(Text, { dimColor: true }, 'Logs')
      ),
      createElement(Box, { flexDirection: "column" },
        displayLogs.length === 0 ?
          createElement(Text, { dimColor: true }, 'Waiting for logs...') :
          displayLogs.map((log, idx) =>
            createElement(Text, { key: idx, wrap: "truncate-end" }, log)
          )
      )
    )
  );
}
