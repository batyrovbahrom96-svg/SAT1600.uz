export type StudentResult = {
  name: string;
  score: string;
  improvement: string;
  video: string;
};

export const studentResults: StudentResult[] = [
  {
    name: "Jasmina Abuduhamidov",
    score: "1200 SAT",
    improvement: "Improved from 1000 to 1200",
    video: "/assets/video/student-jasmina-1200score.mp4"
  },
  {
    name: "Zafar Bazarov",
    score: "1250 SAT",
    improvement: "Improved from 1100 to 1250",
    video: "/assets/video/student-zafar-bazarov-1250sat.mp4"
  },
  {
    name: "Ulugbek Abdurahmanov",
    score: "1100 SAT",
    improvement: "Improved from 900 to 1100 at age 16",
    video: "/assets/video/student-ulugbek-abdurahmanov-1100sat.mp4"
  },
  {
    name: "Ismail Sobitov",
    score: "1200 SAT",
    improvement: "Scored 1200 SAT",
    video: "/assets/video/student-ismail-sobitov-1200sat.mp4"
  }
];
