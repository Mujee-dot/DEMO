const fs = require('fs');
const readline = require('readline');
const dayjs = require('dayjs');

const DATA_FILE = 'data.json';

// --- HELPER FUNCTIONS (The Memory Manager) ---

// 1. Read from Disk
function loadData() {
  // If file doesn't exist, return empty list
  if (!fs.existsSync(DATA_FILE)) { 
    return []; 
  }
  
  const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
  
  // If file is empty, return empty list, otherwise parse JSON
  return fileContent ? JSON.parse(fileContent) : [];
}

// 2. Write to Disk
function saveData(data) {
  // null, 2 makes the JSON pretty and readable
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- MAIN CLI LOGIC ---

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function startApp() {
  rl.question('Freelancer CLI > ', (input) => {
    const command = input.trim();
    handleCommand(command);
  });
}

function handleCommand(input) {
  const args = input.split(' '); 
  const action = args[0];       // e.g., "start"
  const projectName = args[1];  // e.g., "project1"

  switch (action) {
    case 'exit':
      console.log('Goodbye!');
      rl.close();
      return;

    case 'start':
      if (!projectName) {
        console.log("Error: Please provide a project name. (e.g., 'start project1')");
        break;
      }

      // A. Load Memory
      const allLogs = loadData();

      // B. Create the new "Time Chunk"
      const newEntry = {
        project: projectName,
        start: dayjs().unix(), // Current time in Unix Seconds
        end: null              // Null means "currently running"
      };

      // C. Update Memory
      allLogs.push(newEntry);

      // D. Save to Disk
      saveData(allLogs);
      
      console.log(`Started tracking "${projectName}" at ${dayjs().format('HH:mm:ss')}`);
      break;

    case 'stop':
      if (!projectName) {
        console.log("Error: Please provide a project name.");
        break;
      }

      // A. Load Memory
      const logsToUpdate = loadData();

      // B. Find the Active Log
      // We look for a match where name is correct AND 'end' is still empty
      const activeLog = logsToUpdate.find(entry => 
        entry.project === projectName && entry.end === null
      );

      if (!activeLog) {
        console.log(`Error: No active timer found for "${projectName}".`);
        break;
      }

      // C. Close the Session (Update the Object)
      // Because objects are "passed by reference," changing 'activeLog' 
      // automatically updates it inside the 'logsToUpdate' array!
      const endTime = dayjs().unix();
      activeLog.end = endTime;

      // D. Calculate Duration (Immediate Feedback)
      const durationSeconds = activeLog.end - activeLog.start;
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);

      // E. Save to Disk
      saveData(logsToUpdate);

      console.log(`Stopped tracking "${projectName}".`);
      console.log(`Session Duration: ${hours}h ${minutes}m (${durationSeconds}s)`);
      break;n
      
    case 'report':
      if (!projectName) {
        console.log("Error: Please provide a project name.");
        break;
      }

      // A. Parse the "Since" Filter
      // Input: ["report", "project1", "since", "2025-01-01"]
      const sinceKeyword = args[2];
      const dateString = args[3];
      let filterTimestamp = 0; // Default: 0 means "from the beginning of time"

      if (sinceKeyword === 'since' && dateString) {
        // Convert user date string (e.g. "2025-01-01") to Unix Timestamp
        const parsedDate = dayjs(dateString);
        
        if (parsedDate.isValid()) {
          filterTimestamp = parsedDate.unix();
          console.log(`> Filtering: Showing logs after ${parsedDate.format('YYYY-MM-DD')}`);
        } else {
          console.log("Error: Invalid date format. Try YYYY-MM-DD.");
          break;
        }
      }

      // B. Load Data
      const reportLogs = loadData();
      let totalSeconds = 0;
      let count = 0;

      // C. Loop, Filter, and Sum
      allLogs.forEach(entry => {
        // Filter 1: Project Name Match
        if (entry.project !== projectName) return;

        // Filter 2: Time Match (Start time must be AFTER filter date)
        if (entry.start < filterTimestamp) return;

        // Logic: Handle Active Sessions
        // If 'end' is null, use current time (count work done so far)
        const endTime = entry.end || dayjs().unix(); 
        
        const duration = endTime - entry.start;
        totalSeconds += duration;
        count++;
      });

      // D. Format the Math (Seconds -> Hours/Minutes)
      const reportHours = Math.floor(totalSeconds / 3600);
      const reportMinutes = Math.floor((totalSeconds % 3600) / 60);

      // E. Print Result
      console.log(`-----------------------------------`);
      console.log(`Report for "${projectName}"`);
      console.log(`Total Sessions: ${count}`);
      console.log(`Total Time:     ${reportHours}h ${reportMinutes}m`);
      console.log(`-----------------------------------`);
      break;

    default:
      console.log(`Unknown command. Try "start [project]"`);
      break;
  }

  // Loop back
  startApp();
}

console.log("--- Time Tracker CLI Ready ---");
startApp();
