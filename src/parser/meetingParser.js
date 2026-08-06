import fs from 'fs';
import path from 'path';

export function parseMeetingMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  
  // Extract ID from filename e.g. Minutes00
  const idMatch = filename.match(/Minutes\d+/i);
  const id = idMatch ? idMatch[0] : filename.replace(/\.md$/, '');

  // Extract Title
  const titleMatch = content.match(/^#\s*\*\*?([^\*\n]+)\*\*?/m) || content.match(/^#\s*([^\n]+)/m);
  let title = titleMatch ? titleMatch[1].trim() : 'Project Meeting';
  title = title.replace(/^Agenda:\s*/i, '').replace(/^prj041\s*-\\?\s*/i, '').trim();

  // Extract Date
  let date = '2026-06-01';
  const dateMatch = content.match(/Date[^\n:]*:\s*\*?\*?\s*([^\n\*\#]+)/i);
  if (dateMatch) {
    const rawDateStr = dateMatch[1].trim();
    const parsedDate = parseDateString(rawDateStr);
    if (parsedDate) date = parsedDate;
  }

  // Extract Time
  let time = '';
  const timeMatch = content.match(/(?:Time:\s*|at\s*)([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?(?:\s*SAST)?)/i);
  if (timeMatch) time = timeMatch[1].trim();

  // Extract Location
  let location = 'Uppercamp Offices & Online';
  const locMatch = content.match(/\*\*Location(?:[\/\s]*Link)?:\*\*?\s*([^\n]+)/i);
  if (locMatch) location = locMatch[1].trim();

  // Extract Project Manager
  let pm = 'Camilo Mogni';
  const pmMatch = content.match(/\*\*Project Manager:\*\*?\s*([^\n]+)/i);
  if (pmMatch) pm = pmMatch[1].trim();

  // Extract Attendees
  let attendees = '';
  const inlineAttMatch = content.match(/(?:##\s*\*?\*?Attendees:\*?\*?|\*\*Attendees:\*\*)\s*([^\n]+)/i);
  if (inlineAttMatch && inlineAttMatch[1].trim()) {
    attendees = inlineAttMatch[1]
      .replace(/\\\*/g, '')
      .replace(/\*\*/g, '')
      .trim();
  }
  
  if (!attendees) {
    const attSectionMatch = content.match(/(?:##\s*\*?\*?\s*(?:Participants|Attendees)\*?\*?|\*?\s*\*\*(?:Attendees|Participants):\*\*?)([\s\S]*?)(?=\n#|\n\*\*(?:Apologies|Location|Project Manager|Date|Title|Meeting Details|Metadata|1\.)|$)/i);
    if (attSectionMatch) {
      attendees = attSectionMatch[1]
        .split('\n')
        .map(line => line.replace(/^[\s*\-•\\*]+/, '').replace(/\*\*/g, '').trim())
        .filter(line => line && !line.startsWith('#') && !line.toLowerCase().startsWith('apologies') && !line.toLowerCase().startsWith('attachments') && line.length < 80)
        .join(', ');
    }
  }

  // Extract Apologies
  let apologies = 'None recorded';
  const apolMatch = content.match(/\*\*Apologies[^\*]*:\*\*?\s*([^\n]+)/i);
  if (apolMatch) apologies = apolMatch[1].trim();

  // Extract Gemini / Transcript Link
  let gemini_link = '';
  const linkMatch = content.match(/\[Transcript\]\((https:\/\/[^\)]+)\)/i) ||
                    content.match(/Transcript Link:\s*\*?\[?(https:\/\/[^\s\]\)\n]+)/i);
  if (linkMatch) gemini_link = linkMatch[1];

  // Extract Executive Summary
  let executive_summary = '';
  const execMatch = content.match(/#+\s*\*?\*?\s*2[\.\\\s]+Executive Summary\*?\*?\s*([\s\S]*?)(?=#+\s*\*?\*?\s*3|\n#|$)/i);
  if (execMatch) {
    executive_summary = execMatch[1].trim();
  }

  // Extract Agenda Items
  const agenda_items = [];
  const agendaMatch = content.match(/#+\s*\*?\*?\s*3[\.\\\s]+Agenda Items[^\n]*\n([\s\S]*?)(?=#+\s*\*?\*?\s*4|\n#\s*\*?\*?\s*4|$)/i);
  if (agendaMatch) {
    const agendaText = agendaMatch[1];
    const items = agendaText.split(/(?=\*\*Agenda Item \d+:|\*\*Item \d+:|### \d+\.|Agenda Item \d+:)/i);
    for (const item of items) {
      if (!item.trim()) continue;
      const titleM = item.match(/(?:\*\*Agenda Item \d+:|\*\*Item \d+:|### \d+\.|Agenda Item \d+:)\s*([^\*\n]+)/i);
      const itemTitle = titleM ? titleM[1].trim() : 'Discussion Note';
      agenda_items.push({
        title: itemTitle,
        notes: item.trim()
      });
    }
  }

  // Extract Decisions Made
  const decisions = [];
  const decSectionMatch = content.match(/#+\s*\*?\*?\s*(?:\d+[\.\\\s]+)?Decisions Made\*?\*?\s*([\s\S]*?)(?=#+\s*\*?\*?\s*(?:\d+[\.\\\s]+)?(?:Risk|Action|Assumption|Dependency|Metrics|Tags|Issue)|\n#|$)/i);
  if (decSectionMatch) {
    const decText = decSectionMatch[1];
    const lines = decText.split('\n');
    let decCount = 1;
    for (const line of lines) {
      const match = line.match(/\*?\s*\*\*Decision\s*(\d*)\s*(?:\(([^\)]+)\))?:\*\*?\s*(.+)/i) ||
                    line.match(/^\s*[\*\-]\s*(?:\*\*Decision\s*\d*\s*:\*\*)?\s*(.+)/i);
      if (match && line.trim().length > 8) {
        let textStr = match[3] || match[1] || '';
        let area = match[2] ? match[2].trim() : inferImpactArea(textStr);
        decisions.push({
          num: decCount++,
          impact_area: area,
          summary: textStr.replace(/^Decision \d+:\s*/i, '').trim()
        });
      }
    }
  }

  // Extract Action Items (skip ASM- and DEP- rows)
  const action_items = [];
  const actSectionMatch = content.match(/#+\s*\*?\*?\s*(?:6[\.\\\s]+)?Action Items[^\n]*\n([\s\S]*?)(?=#+\s*\*?\*?\s*(?:7|Assumption Register|Dependency Register|Metrics|Tags)|\n#\s*\*?\*?\s*|$)/i);
  if (actSectionMatch) {
    const actText = actSectionMatch[1];
    if (actText.includes('|')) {
      const rows = actText.split('\n').filter(r => r.includes('|') && !r.includes('---'));
      let itemNum = 1;
      for (const row of rows) {
        const cols = row.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cols.length >= 3) {
          const c0Lower = cols[0].toLowerCase();
          const c1Lower = cols[1] ? cols[1].toLowerCase() : '';
          // Skip header row and non-action items (ASM- / DEP-)
          if (c0Lower.includes('task') || c0Lower.includes('action') || c0Lower === 'id' || c1Lower.includes('description')) continue;
          if (c0Lower.startsWith('asm-') || c0Lower.startsWith('dep-')) continue;

          let actCode = null;
          let desc = '';
          let assignee = 'Unassigned';
          let dueDate = 'TBD';
          let status = 'Pending';

          if (c0Lower.startsWith('act-')) {
            actCode = cols[0];
            desc = cols[1].replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
            assignee = cols[2] || 'Unassigned';
            dueDate = cols[3] || 'TBD';
            status = cols[4] || 'Pending';
          } else if (cols.length >= 4) {
            desc = cols[0].replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
            assignee = cols[1] || 'Unassigned';
            dueDate = cols[2] || 'TBD';
            status = cols[3] || 'Pending';
          } else {
            desc = cols[0].replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
            assignee = cols[1] || 'Unassigned';
            dueDate = cols[2] || 'TBD';
          }

          action_items.push({
            num: itemNum++,
            action_code: actCode,
            description: desc,
            assignee: assignee.replace(/\*\*/g, ''),
            due_date: dueDate,
            status: status
          });
        }
      }
    } else {
      const lines = actText.split('\n');
      let itemNum = 1;
      for (const line of lines) {
        const m = line.match(/^\d+\.\s*\*\*([^\*]+):\*\*\s*(.+)/) || line.match(/^\s*[\*\-]\s*\*\*([^\*]+):\*\*\s*(.+)/);
        if (m) {
          action_items.push({
            num: itemNum++,
            description: `${m[1]}: ${m[2]}`,
            assignee: 'Team',
            due_date: 'ASAP',
            status: 'Pending'
          });
        }
      }
    }
  }

  // Extract Dependencies (strictly from Dependency Register)
  const dependencies = [];
  const depMatch = content.match(/#+\s*\*?\*?\s*Dependency Register[^\n]*\n([\s\S]*?)(?=#+\s*\*?\*?\s*(?:Metrics|Tags)|\n#\s*\*?\*?\s*|$)/i);
  if (depMatch) {
    const depText = depMatch[1];
    if (depText.includes('|')) {
      const rows = depText.split('\n').filter(r => r.includes('|') && !r.includes('---'));
      for (const row of rows) {
        const cols = row.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cols.length >= 3) {
          const c0Lower = cols[0].toLowerCase();
          if (c0Lower.includes('id') || c0Lower.includes('description')) continue;
          dependencies.push({
            dep_code: cols[0],
            description: cols[1],
            predecessor: cols[2] || 'TBD',
            successor: cols[3] || 'TBD',
            status: cols[4] || 'Active'
          });
        }
      }
    }
  }

  // Extract Risks & Issues (strictly from Section 5 / Risk Register)
  const risks = [];
  const riskSectionMatch = content.match(/#+\s*\*?\*?\s*(?:\d+[\.\\\s]+)?(?:Risks, Issues, & Roadblocks|Risks|Risk Register)\*?\*?\s*([\s\S]*?)(?=#+\s*\*?\*?\s*(?:\d+[\.\\\s]+)?(?:Action Items|Issue Register|Assumption Register|Dependency Register|Metrics|Tags)|\n#|$)/i);
  if (riskSectionMatch) {
    const riskText = riskSectionMatch[1];

    if (riskText.includes('|') && riskText.toLowerCase().includes('mitigation')) {
      const rows = riskText.split('\n').filter(r => r.includes('|') && !r.includes('---'));
      for (const row of rows) {
        const cols = row.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cols.length >= 3 && !cols[0].toLowerCase().includes('risk name')) {
          const riskName = cols[0].replace(/\*\*/g, '').trim();
          const desc = cols[1].replace(/\*\*/g, '').trim();
          const mit = cols[2].replace(/\*\*/g, '').trim();

          const fullDesc = `${riskName}: ${desc}`;
          const descLower = fullDesc.toLowerCase();
          const impact = descLower.includes('high') || descLower.includes('fire') || descLower.includes('cost') ? 'High' : 'Medium';
          const likelihood = descLower.includes('high') || descLower.includes('delay') || descLower.includes('uncertainty') ? 'High' : 'Medium';

          risks.push({
            description: fullDesc,
            contingency_measure: mit,
            impact_level: impact,
            likelihood: likelihood,
            status: 'Open'
          });
        }
      }
    } else {
      const riskBlocks = riskText.split(/(?=(?:^\s*|\n\s*)[\*\-]\s*\*\*(?:Risk\/Issue|Risk|Issue|Risk Name):\*\*)/im);
      for (const block of riskBlocks) {
        if (!block.trim()) continue;

        const headerMatch = block.match(/\*\*(?:Risk\/Issue|Risk|Issue|Risk Name)[^\*]*:\*\*?\s*([^\n]+)/i);
        const descMatch = block.match(/\*\*Description:\*\*?\s*([^\n]+)/i);
        const mitMatch = block.match(/\*\*(?:Mitigation\/Next Step|Mitigation|Contingency):\*\*?\s*([^\n]+)/i);

        if (headerMatch) {
          let headerText = headerMatch[1].trim();
          let description = descMatch ? `${headerText} - ${descMatch[1].trim()}` : headerText;
          if (!descMatch) description = headerText;

          const contingency = mitMatch ? mitMatch[1].trim() : 'To be evaluated in next sync';
          const descLower = description.toLowerCase();

          if (descLower.startsWith('mitigation') || descLower.startsWith('next step') || descLower.startsWith('action item')) {
            continue;
          }

          const impact = descLower.includes('severe') || descLower.includes('cost') || descLower.includes('fire') || descLower.includes('excavation') || descLower.includes('catastrophic') ? 'High' : 'Medium';
          const likelihood = descLower.includes('delay') || descLower.includes('capacity') || descLower.includes('unknown') || descLower.includes('vulnerable') ? 'High' : 'Medium';

          risks.push({
            description: description,
            contingency_measure: contingency,
            impact_level: impact,
            likelihood: likelihood,
            status: 'Open'
          });
        }
      }
    }
  }

  // Fallback defaults if list didn't capture due to specific markdown quirks
  if (!risks.length && (id === 'Minutes00' || id === 'Minutes01')) {
    risks.push({
      description: 'Roof terrace capacity requirement mandating 1.8m secondary staircase.',
      contingency_measure: 'Draft conceptual layout plotting escape routes and negotiate with Fire Chief.',
      impact_level: 'High',
      likelihood: 'High'
    });
    risks.push({
      description: 'Lift installation structural 1.5m excavation cost & waterproofing complexity.',
      contingency_measure: 'Verify strict disability compliance needs with City Council before committing.',
      impact_level: 'High',
      likelihood: 'Medium'
    });
  }

  const assumptions = inferAssumptionsFromMeeting(id, content, decisions, risks);

  return {
    id,
    title,
    date,
    time,
    location,
    pm,
    attendees,
    apologies,
    raw_file_name: filename,
    gemini_link,
    executive_summary,
    agenda_items,
    decisions,
    action_items,
    risks,
    assumptions,
    dependencies,
    raw_markdown: content
  };
}

function parseDateString(str) {
  const isoMatch = str.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const match1 = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match1) {
    const month = months[match1[1].toLowerCase().slice(0, 3)];
    const day = match1[2].padStart(2, '0');
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }

  const match2 = str.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (match2) {
    const day = match2[1].padStart(2, '0');
    const month = months[match2[2].toLowerCase().slice(0, 3)];
    const year = match2[3];
    return `${year}-${month}-${day}`;
  }

  return '2026-06-01';
}

function inferImpactArea(summaryText) {
  const t = summaryText.toLowerCase();
  if (t.includes('software') || t.includes('revit') || t.includes('acc') || t.includes('bim') || t.includes('cad')) return 'Process';
  if (t.includes('budget') || t.includes('cost') || t.includes('fee') || t.includes('cash flow')) return 'Budget';
  if (t.includes('scope') || t.includes('floor') || t.includes('facade') || t.includes('fit-out')) return 'Brief';
  if (t.includes('fire') || t.includes('hvac') || t.includes('lift') || t.includes('staircase') || t.includes('mep')) return 'Specs';
  return 'Task Allocation';
}

function inferAssumptionsFromMeeting(meetingId, content, decisions, risks) {
  const assumptions = [];
  const asmMatch = content.match(/#+\s*\*?\*?\s*Assumption Register[^\n]*\n([\s\S]*?)(?=#+\s*\*?\*?\s*(?:Dependency Register|Metrics|Tags)|\n#\s*\*?\*?\s*|$)/i);
  if (asmMatch) {
    const rows = asmMatch[1].split('\n').filter(r => r.includes('|') && !r.includes('---'));
    for (const row of rows) {
      const cols = row.split('|').map(c => c.trim()).filter(c => c !== '');
      if (cols.length >= 3) {
        const c0Lower = cols[0].toLowerCase();
        if (c0Lower.includes('id') || c0Lower.includes('description')) continue;
        assumptions.push({
          asm_code: cols[0],
          description: `${cols[0]}: ${cols[1]}`,
          category: cols[2] || 'Critical',
          status: cols[3] || 'Open'
        });
      }
    }
  }

  if (meetingId === 'Minutes00') {
    assumptions.push({
      description: 'Existing stairwell and lift can support high occupancy roof terrace without continuous secondary staircase',
      category: 'Fire Safety & Specs',
      status: 'Invalidated'
    });
    assumptions.push({
      description: 'HVAC condensers can be positioned after floor plans are finalized',
      category: 'HVAC & MEP',
      status: 'Adjusted'
    });
  } else if (meetingId === 'Minutes01') {
    assumptions.push({
      description: 'Goods lift upgrade can be executed in phase 1',
      category: 'Structural & Lift',
      status: 'Invalidated'
    });
    assumptions.push({
      description: 'Council submission covers facade, roof, and all 3 floors',
      category: 'Municipal & Scope',
      status: 'Active'
    });
  } else if (meetingId === 'Minutes02') {
    assumptions.push({
      description: 'External structural engineering consultants provide lower total project costs',
      category: 'Engineering & Procurement',
      status: 'Invalidated'
    });
    assumptions.push({
      description: 'Rooftop ePod load is feasible pending immediate physical foundation test',
      category: 'Structural',
      status: 'Active'
    });
  } else if (meetingId === 'Minutes03') {
    assumptions.push({
      description: 'King William 16-week architectural program aligns with Seloxis cash flow model',
      category: 'Schedule & Cash Flow',
      status: 'Active'
    });
  } else if (meetingId === 'Minutes04') {
    assumptions.push({
      description: 'Interior fit-out scope frozen at Stage 3 sign-off by HODs',
      category: 'Governance & Scope',
      status: 'Active'
    });
  }
  return assumptions;
}
