import React, { useState } from 'react';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const periodsPerDay = 6;

export default function TimetableGenerator() {
  const [semester, setSemester] = useState('');
  const [sections, setSections] = useState(1);
  const [subjects, setSubjects] = useState([{ code: '', hours: 1 }]);
  const [facultyCount, setFacultyCount] = useState(1);
  const [algorithm, setAlgorithm] = useState('DSatur');
  const [timetable, setTimetable] = useState(null);
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

  const generateTimetable = () => {
    assignFaculties();
    const graph = buildGraph();
    let result = {};
    if (algorithm === 'DSatur') result = dsaturColoring(graph);
    if (algorithm === 'WelshPowell') result = welshPowellColoring(graph);
    if (algorithm === 'Greedy') result = greedyColoring(graph);
    if (algorithm === 'ActivitySelector') result = activitySelector(graph);

    // Now assign periods based on weekly hours
    const totalSlots = days.length * periodsPerDay;
    const timetableGrid = Array(days.length).fill(0).map(() => Array(periodsPerDay).fill(null));

    const allSlots = [];
    days.forEach((_, dIdx) => {
      for (let p = 0; p < periodsPerDay; p++) {
        allSlots.push([dIdx, p]);
      }
    });

    let slotIndex = 0;
    subjects.forEach(sub => {
      const hours = sub.hours;
      for (let h = 0; h < hours; h++) {
        if (slotIndex >= allSlots.length) break;
        const [d, p] = allSlots[slotIndex++];
        timetableGrid[d][p] = {
          subject: sub.code,
          faculty: facultyAssignments[sub.code]
        };
      }
    });
    setTimetable(timetableGrid);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 to-blue-500 flex flex-col items-center p-4 text-white">
      <h1 className="text-3xl font-bold mb-4">📅 Timetable Generator</h1>

      <div className="bg-white text-black p-4 rounded-xl shadow-xl w-full max-w-3xl">
        <div className="mb-2">
          <label>Semester: </label>
          <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)} className="border p-1 rounded ml-2" />
        </div>

        <div className="mb-2">
          <label>Number of Sections: </label>
          <input type="number" value={sections} onChange={(e) => setSections(parseInt(e.target.value))} className="border p-1 rounded ml-2 w-20" />
        </div>

        <div className="mb-2">
          <label>Number of Faculty: </label>
          <input type="number" value={facultyCount} onChange={(e) => setFacultyCount(parseInt(e.target.value))} className="border p-1 rounded ml-2 w-20" />
        </div>

        <div className="mb-2">
          <h2 className="font-semibold">Subjects:</h2>
          {subjects.map((sub, idx) => (
            <div key={idx} className="flex gap-2 mb-1">
              <input type="text" placeholder="Code" value={sub.code} onChange={(e) => handleSubjectChange(idx, 'code', e.target.value)} className="border p-1 rounded w-24" />
              <input type="number" placeholder="Hours/Week" value={sub.hours} onChange={(e) => handleSubjectChange(idx, 'hours', e.target.value)} className="border p-1 rounded w-24" />
            </div>
          ))}
          <button onClick={addSubject} className="bg-blue-500 text-white px-3 py-1 rounded">+ Add Subject</button>
        </div>

        <div className="mb-2">
          <label>Select Algorithm: </label>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="border p-1 rounded ml-2">
            <option value="DSatur">DSatur</option>
            <option value="WelshPowell">Welsh-Powell</option>
            <option value="Greedy">Greedy Coloring</option>
            <option value="ActivitySelector">Activity Selector</option>
          </select>
        </div>

        <button onClick={generateTimetable} className="bg-green-500 text-white px-4 py-2 rounded mt-2">Generate Timetable</button>
      </div>

      {timetable && (
        <div className="bg-white text-black p-4 rounded-xl shadow-xl w-full max-w-5xl mt-6 overflow-x-auto">
          <h2 className="font-semibold text-xl mb-2">Generated Timetable</h2>
          <table className="w-full border text-center">
            <thead>
              <tr>
                <th className="border p-2">Day / Period</th>
                {[...Array(periodsPerDay)].map((_, i) => (
                  <th key={i} className="border p-2">P{i+1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dIdx) => (
                <tr key={dIdx}>
                  <td className="border p-2 font-semibold">{day}</td>
                  {[...Array(periodsPerDay)].map((_, pIdx) => (
                    <td key={pIdx} className="border p-2">
                      {timetable[dIdx][pIdx] ? (
                        <div>
                          <div>{timetable[dIdx][pIdx].subject}</div>
                          <div className="text-sm text-gray-500">{timetable[dIdx][pIdx].faculty}</div>
                        </div>
                      ) : '-' }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}