export type StudentResult = {
  certificate?: string;
  evidence: string;
  method: string;
  name: string;
  score: string;
  improvement: string;
  testDate?: string;
  video: string;
};

export const studentResults: StudentResult[] = [
  {
    name: "Muslima Xalikova",
    score: "1330 SAT",
    improvement: "Reached 1330 SAT in 3 months",
    method: "Diagnostic plan + targeted SAT practice",
    evidence: "Video + SAT score report",
    testDate: "March 14, 2026",
    certificate: "/assets/results/muslima-xalikova-1330-sat.png",
    video: "/assets/video/student-muslima-1330sat.mp4"
  },
  {
    name: "Jasmina Abdihamidova",
    score: "1200 SAT",
    improvement: "Improved from 1000 to 1200",
    method: "SATTEST.UZ practice route + mock review",
    evidence: "Video + SAT score report",
    testDate: "May 2, 2026",
    certificate: "/assets/results/jasmina-abdihamidova-1200-sat.jpg",
    video: "/assets/video/student-jasmina-1200score.mp4"
  },
  {
    name: "Zafar Bazarov",
    score: "1150 SAT",
    improvement: "Improved from 1100 to 1150",
    method: "Math-focused correction + SAT practice",
    evidence: "Video + SAT score report",
    testDate: "May 2, 2026",
    certificate: "/assets/results/zafar-bazarov-1150-sat.jpg",
    video: "/assets/video/student-zafar-bazarov-1250sat.mp4"
  },
  {
    name: "Ulugbek Abdurahmonov",
    score: "1100 SAT",
    improvement: "Improved from 900 to 1100 at age 16",
    method: "Diagnostic review + targeted weak-topic drills",
    evidence: "Video + SAT score report",
    testDate: "May 2, 2026",
    certificate: "/assets/results/ulugbek-abdurahmonov-1100-sat.jpg",
    video: "/assets/video/student-ulugbek-abdurahmanov-1100sat.mp4"
  },
  {
    name: "Ismail Sobinov",
    score: "1200 SAT",
    improvement: "Scored 1200 SAT",
    method: "Diagnostic analytics + targeted SAT practice",
    evidence: "Video + SAT score report",
    testDate: "May 2, 2026",
    certificate: "/assets/results/ismail-sobinov-1200-sat.jpg",
    video: "/assets/video/student-ismail-sobitov-1200sat.mp4"
  }
];
