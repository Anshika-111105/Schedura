import React, { useState, useEffect } from 'react';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const periodsPerDay = 6;

const tableHeaderStyle = { padding: '8px', background: '#8d9db6', color: '#fff', borderRadius: '8px 8px 0 0' };
const tableCellStyle = { padding: '10px', borderBottom: '1px solid #bccad6', background: '#f1e3dd', color: '#667292' };
const tableCellStyleBold = { padding: '10px', borderBottom: '1px solid #bccad6', fontWeight: 'bold', background: '#bccad6', color: '#667292' };

export default function TimetableGenerator() {
  useEffect(() => {
    document.title = "Schedura";
  }, []);

  const [semester, setSemester] = useState('');
  const [sections, setSections] = useState(1);
  const [subjects, setSubjects] = useState([{ code: '', hours: 1 }]);
  const [facultyCount, setFacultyCount] = useState(1);
  const [algorithm, setAlgorithm] = useState('alloptimized');
  const [timetables, setTimetables] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState({});

  const addSubject = () => {
    setSubjects([...subjects, { code: '', hours: 1 }]);
  };

  const handleSubjectChange = (index, field, value) => {
    const updated = [...subjects];
    updated[index][field] = field === 'hours' ? parseInt(value) : value;
    setSubjects(updated);
  };

  const assignFaculties = () => {
    const assignments = {};
    subjects.forEach(sub => {
      const faculty = 'Faculty-' + (Math.floor(Math.random() * facultyCount) + 1);
      assignments[sub.code] = faculty;
    });
    setFacultyAssignments(assignments);
  };

  const buildGraph = () => {
    const graph = {};
    subjects.forEach(sub => {
      graph[sub.code] = [];
    });
    subjects.forEach((s1, i) => {
      subjects.forEach((s2, j) => {
        if (i !== j && facultyAssignments[s1.code] === facultyAssignments[s2.code]) {
          graph[s1.code].push(s2.code);
        }
      });
    });
    return graph;
  };

  const dsaturColoring = (graph) => {
    const colors = {};
    const saturation = {};
    Object.keys(graph).forEach(v => { colors[v] = null; saturation[v] = 0; });

    while (Object.values(colors).includes(null)) {
      const uncolored = Object.keys(colors).filter(v => colors[v] === null);
      uncolored.sort((a, b) => {
        if (saturation[b] === saturation[a]) {
          return graph[b].length - graph[a].length;
        }
        return saturation[b] - saturation[a];
      });
      const node = uncolored[0];
      const neighborColors = graph[node].map(n => colors[n]).filter(c => c !== null);
      let color = 1;
      while (neighborColors.includes(color)) color++;
      colors[node] = color;

      graph[node].forEach(n => {
        if (colors[n] === null) saturation[n] = new Set(graph[n].map(nb => colors[nb]).filter(c => c !== null)).size;
      });
    }
    return colors;
  };

  const welshPowellColoring = (graph) => {
    const colors = {};
    const nodes = Object.keys(graph).sort((a, b) => graph[b].length - graph[a].length);
    let color = 1;
    nodes.forEach(node => {
      if (!colors[node]) {
        colors[node] = color;
        nodes.forEach(other => {
          if (!colors[other] && !graph[node].includes(other) && Object.keys(colors).every(k => !(colors[k] === color && graph[other].includes(k)))) {
            colors[other] = color;
          }
        });
        color++;
      }
    });
    return colors;
  };

  const greedyColoring = (graph) => {
    const colors = {};
    Object.keys(graph).forEach(node => {
      const neighborColors = graph[node].map(n => colors[n]).filter(c => c !== undefined);
      let color = 1;
      while (neighborColors.includes(color)) color++;
      colors[node] = color;
    });
    return colors;
  };

  const activitySelector = (graph) => {
    const colors = {};
    let color = 1;
    Object.keys(graph).forEach(node => {
      colors[node] = color;
      color = color % 5 + 1;
    });
    return colors;
  };

  // Helper to count empty slots (for optimization)
  const countEmptySlots = (timetables) => {
    let empty = 0;
    timetables.forEach(timetable =>
      timetable.forEach(row =>
        row.forEach(cell => { if (!cell) empty++; })
      )
    );
    return empty;
  };

  // Generate timetables for all sections, resolving conflicts among them
  const generateTimetable = () => {
    assignFaculties();
    const graph = buildGraph();

    const algorithms = [
      { name: 'DSatur', fn: dsaturColoring },
      { name: 'WelshPowell', fn: welshPowellColoring },
      { name: 'Greedy', fn: greedyColoring },
      { name: 'ActivitySelector', fn: activitySelector }
    ];

    let bestTimetables = null;
    let minEmpty = Infinity;
    let bestAlgorithm = algorithm;

    const runAlgorithm = (algFn) => {
      const result = algFn(graph);
      const allTimetables = Array(sections).fill(0).map(() =>
        Array(days.length).fill(0).map(() => Array(periodsPerDay).fill(null))
      );
      const allSlots = [];
      days.forEach((_, dIdx) => {
        for (let p = 0; p < periodsPerDay; p++) {
          allSlots.push([dIdx, p]);
        }
      });
      const usedSlots = Array(sections).fill(0).map(() =>
        Array(days.length).fill(0).map(() => Array(periodsPerDay).fill(false))
      );
      const globalSlotMap = {};
      subjects.forEach(sub => {
        for (let sec = 0; sec < sections; sec++) {
          let assigned = 0;
          for (let slotIdx = 0; slotIdx < allSlots.length && assigned < sub.hours; slotIdx++) {
            const [d, p] = allSlots[slotIdx];
            const slotKey = `${d}-${p}`;
            if (
              !usedSlots[sec][d][p] &&
              (!globalSlotMap[slotKey] || !globalSlotMap[slotKey].has(facultyAssignments[sub.code]))
            ) {
              allTimetables[sec][d][p] = {
                subject: sub.code,
                faculty: facultyAssignments[sub.code]
              };
              usedSlots[sec][d][p] = true;
              if (!globalSlotMap[slotKey]) globalSlotMap[slotKey] = new Set();
              globalSlotMap[slotKey].add(facultyAssignments[sub.code]);
              assigned++;
            }
          }
        }
      });
      return allTimetables;
    };

    if (algorithm === 'AllOptimized') {
      for (const alg of algorithms) {
        const timetables = runAlgorithm(alg.fn);
        const empty = countEmptySlots(timetables);
        if (empty < minEmpty) {
          minEmpty = empty;
          bestTimetables = timetables;
          bestAlgorithm = alg.name;
        }
      }
      setTimetables(bestTimetables);
    } else {
      setTimetables(runAlgorithm(algorithms.find(a => a.name.toLowerCase() === algorithm.toLowerCase()).fn));
    }
  };

  // Animation styles
  const fadeIn = {
    animation: 'fadeIn 1s ease'
  };
  const slideDown = {
    animation: 'slideDown 1s cubic-bezier(.68,-0.55,.27,1.55)'
  };

  return (
    <>
      <style>
        {`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98);}
          to { opacity: 1; transform: scale(1);}
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-40px);}
          to { opacity: 1; transform: translateY(0);}
        }
        `}
      </style>
      <div style={{
        minHeight: '100vh',
        background: `
          linear-gradient(135deg, #bccad6cc, #8d9db6cc, #667292cc, #f1e3ddcc),
          url('https://png.pngtree.com/background/20230516/original/pngtree-on-a-test-paper-with-pencils-on-the-table-picture-image_2601717.jpg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#f1e3dd',
          borderRadius: '16px',
          boxShadow: '0 8px 16px rgba(102,114,146,0.15)',
          padding: '30px',
          width: '100%',
          maxWidth: '900px',
          border: '2px solid #bccad6',
          ...fadeIn
        }}>
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              marginBottom: '8px',
              textAlign: 'center',
              letterSpacing: '1px',
              color: '#667292',
              ...slideDown
            }}
          >
            📅 Schedura
          </h1>
          <div
            style={{
              textAlign: 'center',
              color: '#f59e42',
              fontSize: '28px',
              marginBottom: '20px',
              fontFamily: 'Trebuchet MS, Verdana, Geneva, sans-serif',
              fontWeight: 'bold',
              letterSpacing: '1px',
              animation: 'fadeIn 2s'
            }}
          >
            From inputs to insights - Plan smarter
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#667292', fontWeight: 'bold' }}> Enter Semester: </label>
            <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)} style={{ marginLeft: '10px', padding: '5px', borderRadius: '5px', border: '1px solid #bccad6', background: '#fff', color: '#667292' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#667292', fontWeight: 'bold' }}>Number of Sections: </label>
            <input type="number" value={sections} onChange={(e) => setSections(parseInt(e.target.value))} style={{ marginLeft: '10px', padding: '5px', borderRadius: '5px', width: '80px', border: '1px solid #bccad6', background: '#fff', color: '#667292' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#667292', fontWeight: 'bold' }}>Number of Faculty: </label>
            <input type="number" value={facultyCount} onChange={(e) => setFacultyCount(parseInt(e.target.value))} style={{ marginLeft: '10px', padding: '5px', borderRadius: '5px', width: '80px', border: '1px solid #bccad6', background: '#fff', color: '#667292' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ color: '#8d9db6', fontWeight: 'bold' }}>Enter Subject code:</h3>
            {subjects.map((sub, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" placeholder="Code" value={sub.code} onChange={(e) => handleSubjectChange(idx, 'code', e.target.value)} style={{ padding: '5px', borderRadius: '5px', border: '1px solid #bccad6', background: '#fff', color: '#667292' }} />
                <input type="number" placeholder="Hours/Week" value={sub.hours} onChange={(e) => handleSubjectChange(idx, 'hours', e.target.value)} style={{ padding: '5px', borderRadius: '5px', border: '1px solid #bccad6', background: '#fff', color: '#667292' }} />
              </div>
            ))}
            <button onClick={addSubject} style={{ padding: '8px 15px', borderRadius: '5px', background: '#8d9db6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>+ Add Subject</button>
          </div>

          <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <label style={{ color: '#667292', fontWeight: 'bold', marginRight: '10px' }}>Select Algorithm: </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              style={{
                padding: '5px',
                borderRadius: '5px',
                border: '1px solid #bccad6',
                background: '#fff',
                color: '#667292',
                textAlign: 'center',
                minWidth: '200px'
              }}
            >
              <option value="DSatur">DSatur</option>
              <option value="WelshPowell">Welsh-Powell</option>
              <option value="Greedy">Greedy Coloring</option>
              <option value="ActivitySelector">Activity Selector</option>
              <option value="AllOptimized">All Algorithms (Optimized)</option>
            </select>
          </div>

          <button onClick={generateTimetable} style={{
            padding: '12px 20px',
            borderRadius: '8px',
            background: '#667292',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
            width: '100%',
            cursor: 'pointer',
            marginBottom: '20px',
            transition: 'all 0.3s',
            border: 'none'
          }}>Generate Timetable</button>

          {Array.isArray(timetables) && timetables.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              {timetables.map((timetableGrid, secIdx) => (
                <div key={secIdx} style={{ marginBottom: '30px', animation: 'fadeIn 1s' }}>
                  <h2 style={{ marginBottom: '10px', color: '#667292', fontWeight: 'bold' }}>Generated Timetable - Section {secIdx + 1}</h2>
                  <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px #bccad6' }}>
                    <thead>
                      <tr>
                        <th style={tableHeaderStyle}>Day / Period</th>
                        {[...Array(periodsPerDay)].map((_, i) => (
                          <th key={i} style={tableHeaderStyle}>P{i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day, dIdx) => (
                        <tr key={dIdx}>
                          <td style={tableCellStyleBold}>{day}</td>
                          {[...Array(periodsPerDay)].map((_, pIdx) => (
                            <td key={pIdx} style={tableCellStyle}>
                              {timetableGrid[dIdx][pIdx] ? (
                                <>
                                  <div style={{ fontWeight: 'bold', color: '#8d9db6' }}>{timetableGrid[dIdx][pIdx].subject}</div>
                                  <div style={{ fontSize: '12px', color: '#667292' }}>{timetableGrid[dIdx][pIdx].faculty}</div>
                                </>
                              ) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}