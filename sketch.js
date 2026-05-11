let video;
let bodyPose;
let handPose;
let poses = [];
let hands = [];
let connections;
let earringImages = [];
let currentEarring = null;

function preload() {
  // 檢查 ml5 是否成功載入
  if (typeof ml5 === 'undefined') {
    console.error("ml5.js 尚未載入，請檢查 HTML 中的 script 標籤。");
    return;
  }
  // 載入 BodyPose 模型，這可以用來辨識身體關鍵點（包含耳朵）
  bodyPose = ml5.bodyPose();
  // 載入 HandPose 模型
  handPose = ml5.handPose();
  // 載入 5 種指定的耳環圖片
  earringImages[0] = loadImage('pic/acc1_ring.png');
  earringImages[1] = loadImage('pic/acc2_pearl.png');
  earringImages[2] = loadImage('pic/acc3_tassel.png');
  earringImages[3] = loadImage('pic/acc4_jade.png');
  earringImages[4] = loadImage('pic/acc5_phoenix.png');
}

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 擷取攝影機影像
  // 加上錯誤處理，以利排查 NotFoundError
  video = createCapture(VIDEO, function(stream) {
    console.log("攝影機已就緒");
  }, function(err) {
    console.error("無法存取攝影機：", err);
  });

  // 設定影像顯示的寬高為畫布寬高的 50%
  video.size(windowWidth * 0.5, windowHeight * 0.5);
  // 隱藏預設的 HTML 影片元件，我們要在畫布上繪製
  video.hide();

  // 開始偵測姿勢
  if (bodyPose) {
    bodyPose.detectStart(video, gotPoses);
  }
  if (handPose) {
    handPose.detectStart(video, gotHands);
  }
}

function draw() {
  // 設定背景顏色為淺藍色
  background(173, 216, 230);

  let vW = width * 0.5;
  let vH = height * 0.5;
  let xPos = (width - vW) / 2;
  let yPos = (height - vH) / 2;

  // 使用 push() 與 pop() 處理鏡像與置中繪製
  push();
  
  // 移動座標系統實現水平翻轉（鏡像）
  translate(width, 0);
  scale(-1, 1);

  // 繪製攝影機影像到畫布中間
  // 因為座標已經翻轉，xPos 繪製位置會在視覺上的對應位置
  image(video, xPos, yPos, vW, vH);

  // 處理手勢辨識：計算手指數量並更新耳環樣式
  if (hands.length > 0) {
    let numFingers = countFingers(hands[0]);
    // 只有在手指數量為 1~5 時才更新，若為 0 則保留上次的樣子
    if (numFingers >= 1 && numFingers <= 5) {
      currentEarring = earringImages[numFingers - 1];
    }
  }

  // 繪製偵測到的耳垂點
  if (poses.length > 0 && currentEarring) {
    let pose = poses[0];
    
    // ml5 bodyPose 提供 left_ear 與 right_ear
    // 我們選取這兩個點作為耳垂位置的代表
    let leftEar = pose.left_ear;
    let rightEar = pose.right_ear;

    // 設定圖片繪製模式為中心，這樣圖片中心才會對準耳垂點
    imageMode(CENTER);
    let earringSize = 50; // 你可以根據圖片實際大小調整這個數值

    // 畫左耳垂
    if (leftEar && leftEar.confidence > 0.1) {
      // 座標需加上影像在畫布上的位移量
      image(currentEarring, leftEar.x + xPos, leftEar.y + yPos, earringSize, earringSize);
    }

    // 畫右耳垂
    if (rightEar && rightEar.confidence > 0.1) {
      image(currentEarring, rightEar.x + xPos, rightEar.y + yPos, earringSize, earringSize);
    }
    // 恢復預設繪製模式，以免影響其他繪圖邏輯
    imageMode(CORNER);
  }
  
  pop();
}

// 當視窗大小改變時，重新調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) {
    video.size(windowWidth * 0.5, windowHeight * 0.5);
  }
}

// 取得辨識結果的回呼函式
function gotPoses(results) {
  poses = results;
}

function gotHands(results) {
  hands = results;
}

// 計算伸出的手指數量
function countFingers(hand) {
  let count = 0;
  // 食指、中指、無名指、小指：指尖 Y 座標小於 (高於) 第二關節則視為伸出
  if (hand.index_finger_tip.y < hand.index_finger_pip.y) count++;
  if (hand.middle_finger_tip.y < hand.middle_finger_pip.y) count++;
  if (hand.ring_finger_tip.y < hand.ring_finger_pip.y) count++;
  if (hand.pinky_finger_tip.y < hand.pinky_finger_pip.y) count++;
  
  // 拇指：檢查指尖與食指根部的水平距離（簡單判定法）
  let thumbDist = dist(hand.thumb_tip.x, hand.thumb_tip.y, hand.index_finger_mcp.x, hand.index_finger_mcp.y);
  if (thumbDist > 40) count++;
  return count;
}
