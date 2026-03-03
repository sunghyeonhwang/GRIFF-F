// ============================================
// GRIFF Frame — Export Module
// ============================================

function formatTC(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30); // 30fps 기준
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
}

function formatTCSimple(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// CSV Export
// ============================================
function exportCSV(comments, projectTitle) {
  const BOM = '\uFEFF';
  const header = '타임코드,초,작성자,코멘트,해결여부,작성일';
  const rows = comments
    .sort((a, b) => a.timecode - b.timecode)
    .map(c => {
      const body = `"${c.body.replace(/"/g, '""')}"`;
      const author = `"${c.author.replace(/"/g, '""')}"`;
      return `${formatTCSimple(c.timecode)},${c.timecode},${author},${body},${c.resolved ? '해결' : '미해결'},${c.createdAt}`;
    });
  const csv = BOM + [header, ...rows].join('\n');
  const filename = `${projectTitle.replace(/\s+/g, '_')}_comments.csv`;
  downloadFile(filename, csv, 'text/csv;charset=utf-8');
}

// ============================================
// Premiere Pro XML (Markers)
// ============================================
function exportPremiereXML(comments, projectTitle, duration) {
  const fps = 30;
  const timebase = fps;

  function secToFrames(sec) {
    return Math.round(sec * fps);
  }

  const markers = comments
    .sort((a, b) => a.timecode - b.timecode)
    .map(c => {
      const inFrames = secToFrames(c.timecode);
      const outFrames = inFrames + fps; // 1초 길이 마커
      return `
        <marker>
          <comment>${escapeXml(c.body)} — ${escapeXml(c.author)}</comment>
          <name>${escapeXml(c.author)}: ${formatTCSimple(c.timecode)}</name>
          <in>${inFrames}</in>
          <out>${outFrames}</out>
        </marker>`;
    }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence>
    <name>${escapeXml(projectTitle)}</name>
    <duration>${secToFrames(duration)}</duration>
    <rate>
      <timebase>${timebase}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <media>
      <video>
        <track>
          <clipitem>
            <name>${escapeXml(projectTitle)}</name>
            <duration>${secToFrames(duration)}</duration>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>0</start>
            <end>${secToFrames(duration)}</end>
            <in>0</in>
            <out>${secToFrames(duration)}</out>${markers}
          </clipitem>
        </track>
      </video>
    </media>
  </sequence>
</xmeml>`;

  const filename = `${projectTitle.replace(/\s+/g, '_')}_markers.xml`;
  downloadFile(filename, xml, 'application/xml;charset=utf-8');
}

// ============================================
// Final Cut Pro FCPXML (Markers)
// ============================================
function exportFCPXML(comments, projectTitle, duration) {
  const fps = 30;

  function secToFCPTime(sec) {
    const frames = Math.round(sec * fps);
    return `${frames}/${fps}s`;
  }

  const markers = comments
    .sort((a, b) => a.timecode - b.timecode)
    .map(c => {
      return `
          <marker start="${secToFCPTime(c.timecode)}" duration="1/1s" value="${escapeXml(c.author)}: ${escapeXml(c.body)}" />`;
    }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" frameDuration="${secToFCPTime(1)}" width="1920" height="1080" />
  </resources>
  <library>
    <event name="${escapeXml(projectTitle)}">
      <project name="${escapeXml(projectTitle)} — Comments">
        <sequence format="r1" duration="${secToFCPTime(duration)}">
          <spine>
            <gap offset="0/1s" duration="${secToFCPTime(duration)}" start="0/1s">${markers}
            </gap>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;

  const filename = `${projectTitle.replace(/\s+/g, '_')}_markers.fcpxml`;
  downloadFile(filename, xml, 'application/xml;charset=utf-8');
}

// ============================================
// DaVinci Resolve EDL (Markers)
// ============================================
function exportDaVinciEDL(comments, projectTitle) {
  const header = `TITLE: ${projectTitle}\nFCM: NON-DROP FRAME\n`;

  const edlEntries = comments
    .sort((a, b) => a.timecode - b.timecode)
    .map((c, i) => {
      const num = String(i + 1).padStart(3, '0');
      const tc = formatTC(c.timecode);
      const tcOut = formatTC(c.timecode + 1);
      return `${num}  001  V  C  ${tc} ${tcOut} ${tc} ${tcOut}\n* FROM CLIP NAME: ${projectTitle}\n* COMMENT: ${c.author}: ${c.body}${c.resolved ? ' [해결]' : ''}`;
    }).join('\n\n');

  const edl = header + '\n' + edlEntries + '\n';
  const filename = `${projectTitle.replace(/\s+/g, '_')}_markers.edl`;
  downloadFile(filename, edl, 'text/plain;charset=utf-8');
}

// ============================================
// Utility
// ============================================
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 전역 접근용
window.__griffExport = {
  exportCSV,
  exportPremiereXML,
  exportFCPXML,
  exportDaVinciEDL,
};
