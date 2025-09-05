let currentAnalysisData = null;

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const errorMsg = document.getElementById("errorMsg");
const errorText = document.getElementById("errorText");
const loading = document.getElementById("loading");
const results = document.getElementById("results");
const exportBtn = document.getElementById("exportBtn");

//drag and drop
function initializeEventListeners() {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  exportBtn.addEventListener("click", exportReport);
}

function showError(message) {
  errorText.textContent = message;
  errorMsg.classList.add("show");
  setTimeout(() => {
    errorMsg.classList.remove("show");
  }, 5000);
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function exportReport() {
  if (!currentAnalysisData) {
    showError("No analysis data to export");
    return;
  }

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(currentAnalysisData, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "text_analysis_report.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

//validating the file type
function handleFile(file) {
  const validTypes = [".txt", ".doc", ".docx"];
  const fileExtension = "." + file.name.split(".").pop().toLowerCase();

  if (!validTypes.includes(fileExtension)) {
    showError("Please upload a .txt or .docx file");
    return;
  }

  //validating the file size
  if (file.size > 1048576) {
    showError("File size must be less than 1MB");
    return;
  }

  //file info
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileInfo.classList.add("show");

  //process file
  processFile(file);
}

async function processFile(file) {
  loading.classList.add("show");
  results.classList.remove("show");

  try {
    let text = "";

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      text = await readTextFile(file);
    } else if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
      text = await readDocxFile(file);
    } else {
      throw new Error("Unsupported file type");
    }

    const analysis = analyzeText(text);
    displayResults(analysis);
    currentAnalysisData = analysis;
  } catch (error) {
    showError("Error processing file: " + error.message);
  } finally {
    loading.classList.remove("show");
  }
}

//file readers
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read text file"));
    reader.readAsText(file);
  });
}

function readDocxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      mammoth
        .extractRawText({ arrayBuffer: e.target.result })
        .then((result) => resolve(result.value))
        .catch((error) =>
          reject(new Error("Failed to read DOCX file: " + error.message))
        );
    };
    reader.onerror = () => reject(new Error("Failed to read DOCX file"));
    reader.readAsArrayBuffer(file);
  });
}

//text analysis
function analyzeText(text) {
  //basic metrics
  const totalCharsWithSpaces = text.length;
  const totalChars = text.replace(/\s/g, "").length;

  //words analysis
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const totalWords = words.length;
  const uniqueWordsSet = new Set(words);
  const uniqueWords = uniqueWordsSet.size;

  //word frequency analysis
  const wordFreq = {};
  words.forEach((word) => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  //Sentence analysis
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const totalSentences = sentences.length;

  //longest sentence
  const longestSentence = sentences
    .reduce(
      (longest, current) =>
        current.length > longest.length ? current : longest,
      ""
    )
    .trim();

  //average word length
  const avgWordLength =
    words.length > 0
      ? (
          words.reduce((sum, word) => sum + word.length, 0) / words.length
        ).toFixed(2)
      : 0;

  //palindromic words(≥3 characters)
  const palindromes = words.filter(
    (word) => word.length >= 3 && word === word.split("").reverse().join("")
  );
  const palindromesCount = new Set(palindromes).size;

  //bigrams
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(words[i] + " " + words[i + 1]);
  }

  const bigramFreq = {};
  bigrams.forEach((bigram) => {
    bigramFreq[bigram] = (bigramFreq[bigram] || 0) + 1;
  });

  const topBigrams = Object.entries(bigramFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalCharacters: totalChars,
    totalCharactersWithSpaces: totalCharsWithSpaces,
    totalWords: totalWords,
    uniqueWords: uniqueWords,
    topWords: topWords,
    sentenceCount: totalSentences,
    averageWordLength: parseFloat(avgWordLength),
    longestSentence:
      longestSentence.substring(0, 100) +
      (longestSentence.length > 100 ? "..." : ""),
    palindromicWordsCount: palindromesCount,
    topBigrams: topBigrams,
    timestamp: new Date().toISOString(),
  };
}

//results
function displayResults(analysis) {
  document.getElementById("totalChars").textContent =
    analysis.totalCharacters.toLocaleString();
  document.getElementById("totalCharsWithSpaces").textContent =
    analysis.totalCharactersWithSpaces.toLocaleString();
  document.getElementById("totalWords").textContent =
    analysis.totalWords.toLocaleString();
  document.getElementById("uniqueWords").textContent =
    analysis.uniqueWords.toLocaleString();
  document.getElementById("totalSentences").textContent =
    analysis.sentenceCount.toLocaleString();
  document.getElementById("avgWordLength").textContent =
    analysis.averageWordLength;
  document.getElementById("palindromes").textContent =
    analysis.palindromicWordsCount;

  //top words
  const topWordsContainer = document.getElementById("topWords");
  topWordsContainer.innerHTML = "";
  analysis.topWords.forEach(([word, count]) => {
    const wordItem = document.createElement("div");
    wordItem.className = "word-item";
    wordItem.innerHTML = `
                  <span class="word-text">${word}</span>
                  <span class="word-count">${count}</span>
              `;
    topWordsContainer.appendChild(wordItem);
  });

  //top bigrams
  const topBigramsContainer = document.getElementById("topBigrams");
  topBigramsContainer.innerHTML = "";
  analysis.topBigrams.forEach(([bigram, count]) => {
    const bigramItem = document.createElement("div");
    bigramItem.className = "word-item";
    bigramItem.innerHTML = `
                  <span class="word-text">"${bigram}"</span>
                  <span class="word-count">${count}</span>
              `;
    topBigramsContainer.appendChild(bigramItem);
  });

  //longest sentence
  document.getElementById("longestSentence").textContent =
    analysis.longestSentence;

  //showing results
  results.classList.add("show");
}

//initializing app
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
});
