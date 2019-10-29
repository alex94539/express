const express = require('express');
const cors = require('cors');
const router = express.Router();

const sql = require('mysql');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const moment = require('moment');

const auth = require('../api/auth');

const key = "OumaeKumiko";

let token, payload;
const connection = sql.createPool({
  host: 'localhost',
  user: 'main',
  password: '',
  database: 'kumiko'
});

function set(res) {
  res.set('Access-Control-Allow-Headers', 'Authorization,Content-type, Accept');
  res.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Origin', '*');
}

function log(user, event) {
  console.log(`UserID ${user} request ${event} `);
}



router.use(cors());

router.options('*', cors());

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
/*
                /auth/login
*/

router.options('/auth/login', async (req, res, next) => {
  set(res);
  res.set('Allow', 'POST, OPTIONS');
  res.send({ code: 200 });
});

router.post('/auth/login', async (req, res, next) => {
  set(res);
  res.set('Allow', 'POST, OPTIONS');
  if (!req.body.account) {
    res.send("wrong pattern, put data in body");
  }
  else {
    let temp = await search(req.body.account, req.body.pwd);
    console.log(temp.truth);

    if (temp.truth) {

      log(temp.index, `login`);

      let temp_in = await duplicate(req.body.account);
      if (temp_in.truth) {
        await logout(temp_in.token);

        console.log(`UserID ${temp.index} failed to login - Duplicate`);

        res.send({
          code: 401,
          text: '先前未登出，請重新登入'
        })
      }
      else {
        payload = {
          account: req.body.account,
          password: req.body.pwd,
          device: req.body.device
        }

        token = jwt.sign(payload, key);

        await newlog(token, req.body.account, req.body.device, temp.index);

        console.log(`UserID ${temp.index} logged in successful`);

        res.send({
          code: 200,
          token: token
        });
      }
    }
    else {

      res.send({ code: 401 });
    }
  }
});

/*
              /auth/logout
*/

router.get('/auth/logout', async (req, res, next) => {

  set(res);
  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `logout`);

    await logout(req.header('Authorization'));
    res.send({
      code: 200,
      logout: true
    });
  }
  else {

    res.send({ code: 403 });
  }
});

/*
            /auth/profile
*/

router.get('/auth/profile', async (req, res, next) => {

  set(res);
  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get profile`);

    res.send(await userprofile(temp.userID));
  }
  else {
    res.send({ code: 403 });
  }
});

router.patch('/auth/profile', async (req, res, next) => {
  set(res);
  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `patch profile`);

    res.send(await updateprofile(req.body, temp.userID));
  }
  else {
    res.send({ code: 403 });
  }
});

router.options('/auth/profile', async (req, res, next) => {
  set(res);

  res.set('Allow', 'GET, PATCH, OPTIONS');
  res.send({ code: 200 });
});

router.get('/notification', async (req, res, next) => {
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get notification`);

    let data = await notification();
    res.send({
      code: 200,
      data: data
    })
  }
  else {
    res.send({ code: 403 });
  }

});

router.get('/board', async (req, res, next) => {
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get board`);

    let data = await board();
    res.send({
      code: 200,
      data: data
    });
  }
  else {
    res.send({ code: 403 });
  }
});

router.get('/pasi', async (req, res, next) => {
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get pasi`);

    let data = await getpasi(temp.userID);
    res.send({
      code: 200,
      data: data
    });
  }
  else {
    res.send({ code: 403 });
  }
});

router.post('/pasi', async (req, res, next) => {
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `post pasi`);

    let data = await addpasi(req.body, temp.userID);
    res.send(data);
  }
  else {
    res.send({ code: 403 });
  }
});

router.delete('/pasi/:pasiindex', async (req, res, next) => {
  let index = req.params.pasiindex;
  console.log(index);
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `delete pasi`);

    res.send(await deletepasi(index, temp.userID));
  }
  else{
    res.send({ code: 403 });
  }
});

router.put('/pasi/:pasiindex', async (req, res, next) => {
  let index = req.params.pasiindex;

  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `put pasi`);

    res.send(await putpasi(index, temp.userID, req.body));
  }
});


router.post('/temp', async (req, res, next) => {
  set(res);

  let m = await temp();
  res.send(m);
});


function temp() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        "result": [
          "data:image/png;base64,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nvF7/v3vf19VVW9605tO+zWzn3vwwQfP+HszT6P+f5pU853orbV2ySWXtKpqb3vb2+b1Wr/61a9aVbXVq1e3F198cc5zDzzwwMz7eOihh076s0899VQ766yzWlW173znO/N63XXr1rWqajfffHPfr1u7dm2rqvapT31qXt+fM2eiT5B169ZVVZ20ow9y6aWX1vnnn18vvPBC/fa3v53z3Jvf/OZ661vfWlWnnup79+6to0eP1ubNm+t973vfvF73xH6+atWqvl934vkTX8/iE/oEaX1OrR05cqR27dpV7373u2vTpk21cuXKORfjPP3001VV9be//e2kP3viB2L33HPPnItzWmu1Z8+eqqratm3bzOrA5BH6BPnHP/5RVVXr16+f89+ffvrpuvTSS+vGG2+sH/zgB/Xkk09Wr9erDRs21MaNG2vjxo21bNm//6c+1U+2t27dWuvWrasDBw7UvffeO/Pff/SjH9XDDz9cy5cvr23bts37/Z577rlVVXX48OG+X3fi+RNfz+IT+oR4/vnn65FHHqmqqte97nVznrv55ptr//79tX79+vrqV79aTz75ZL344ov1zDPPzFyIs2nTpqo69VHBypUr69prr62qqq985Ssz//3l/hDuhBOv+cQTT5z2aw4fPlzPPffcnK9n8Ql9Qtx///117Nixqqp65zvfOfPfjx49OjOFv/CFL9R1111XF1xwwZw/e+zYsTpw4EDf73/DDTdUr9erH//4x/Xwww/XgQMH6r777quqqu3bt7+s93ziJ+onfvp+KrOfe+Mb3/iyXofBhD4Bjhw5UnfccUdVVZ133nn1wQ9+cOa5Z555ZuZilxMX1XT97Gc/63tBTFXVJZdcUu9617uqtVZ33333zL6+efPmuuqqq17W+77yyiurquqhhx6qxx9//JRfc//991dV1Stf+cq64oorXtbrMJjQx9yLL75Y1157bf3mN7+pqn9fYbZ27dqZ59esWVO9Xq+qqh544IGT/vy//vWvk86fn86JH8p97WtfmzmEv/7661/2D+GuvvrqOvfcc6u1VnfeeedJzz/33HO1a9euqqr60Ic+VKtXr35Zr8MZGOnJvWD9zqMfO3as7d+/v911111ty5YtM1/30Y9+9JSfYLviiitaVbXXvva17Yc//GE7duxYa621/fv3tyuvvLKdffbZbfXq1a2q2t69e0/7no4ePdpe85rXzLze8uXL21//+tcF/T137tzZqqr1er12++23t+eff7611tof//jHmfe9evXq9sgjjyzodehP6CNyuo+prl27ti1btmzO5asbNmxou3btOu33+vWvfz0TclW1s88+e+bS1hUrVrR77rmnXXTRRQNDb621z33uczPf5/3vf/+C/57dj6kuX768nXfeeT6musSEPiKzQz/xT6/Xa+ecc07btGlTu+yyy9qNN97Y9u3b11566aWB3+/BBx9sW7dubRs2bGhnnXVW27RpU9u6dWv75S9/2VprZxz67Cvlvvvd7y7GX7W11tq+ffvalVde2TZs2NDOPvvsdtFFF7WPfexj7U9/+tOivQan12ttwj7gzFDddddddcstt9TmzZvrsccec5HMlPDDOGYcO3asvvSlL1VV1cc//nGRTxGhU1X//sz5jh076s9//nOtXr165ifwTIcVo34DjNa+ffvqlltuqWeffXbmQyW33357vfrVrx7xO2MxCT3c888/X3/5y1/qrLPOqte//vX1yU9+sm666aZRvy0WmR/GQQA7OgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgQQOgT4PzxqTSlDdgFdAAAAAElFTkSuQmCC",
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAAQaCAYAAABq52WsAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAHsAAAB7AB1IKDYgAAADh0RVh0U29mdHdhcmUAbWF0cGxvdGxpYiB2ZXJzaW9uMy4xLjEsIGh0dHA6Ly9tYXRwbG90bGliLm9yZy8QZhcZAAAbLklEQVR4nO3dT6ycBbnH8Wfa8icWKqHVYlNCE0PiQoxWFigxEhdGvCYCid0YEsypWsQNhFiIJuA1MXThvRsiRahVMEZjg4kbjUSjsWpUohK9sEEBY21pG4wptNrSzl0YjnPeQ2cYZt6ZOfP7fBIShuk5Zxrz9Xmf874zb6fb7XYLmGurpv0CgPYJHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQIIHQKsmeYP/68NN9Sl52+Z5kto1f0X/e90fvD/TefH8tpcf/319cgjj7T6M6Ya+qXnb6n/fvP/TPMltOr+y4XOYFu2bGn9Zzh0hwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBChwBrpv0Cojw4oZ+zZ0I/hxXDRIcAQocADt3bNKlDdRjARIcAQocAQocAQocAQocAQocAQocAzqPPgZ2d7pLHu6ozpVfCrDLRIYDQIYDQIYAdfYJ6d+ld3f579LK9u+fP93uuqsqKTpOJDgGEDgEcureoeYj9ap8bx5+HXiY6BBA6BBA6BLCjzwOn0xjARIcAQocAQocAdvQVwltPGYWJDgGEDgGEDgGmuqPfv63q/v+Z5ito187GWt3vraZNdnLGyUSHAEKHAE6vTZC3mjItJjoEEDoEEDoEsKNP0DCn12CcTHQIIHQIIHQIYEdvUb+7sTSfa+7sO8sdUhkfEx0CCB0COHRfIXoP5XctNA7j90z4xbDimOgQQOgQQOgQwI6+Ej044LEzcTSY6BBA6BBA6BDAjj4j+l0uWzXk21qbf9TOHs9EhwBChwBChwB29BVi0A7f10LPv7suPpKJDgGEDgEcuifovUTWoXskEx0CCB0CCB0C2NHTNC+P3d54bIefSyY6BBA6BBA6BLCjt6m5/z74Kp97Nc/DEEx0CCB0CCB0CGBHb9OgvXuYrx2XYV4Dc8NEhwBChwAO3ds0zOk1p9NokYkOAYQOAYQOAezo0zLo1NsQO3vzLi7LPjF2mFNqPjF2LpnoEEDoEEDoEMCO3qZhzoWP87x5v5u6LDQeN/fw5vPMBRMdAggdAjh0n1VDnF5bdjqt36H7oFNmTqnNJRMdAggdAggdAtjRZ5W3qTJGJjoEEDoEEDoEsKPPqIFvPYUhmOgQQOgQQOgQwI4+I5o7+VCs7wxgokMAoUMAh+5t6vfpq8Ne4urwnBGY6BBA6BBA6BDAjj4tA+6esstSzhiZ6BBA6BBA6BDAjj5J/c6d+5hlWmSiQwChQwChQwA7+iT1njv3cc5MkIkOAYQOARy6T9IQh+s7q/EpsC6JZQQmOgQQOgQQOgSwo7dpnKfQ+n1IrPWdAUx0CCB0CCB0CGBHXyF67+Sy7M6qzf3dzk6DiQ4BhA4BhA4B7Ogzorl3N++uumwv78fOToOJDgGEDgEcus+ooQ7VB+k9lHcYH8lEhwBChwBChwB29DQLjcfuEBPBRIcAQocAQocAdvQ0zY+3sqNHMNEhgNAhgEP3Nm3v89ys3GTR6bYIJjoEEDoEEDoEsKO3aVb2cOKZ6BBA6BBA6BDAjt6mfufRm2Zln+89r+6c+tww0SGA0CGA0CGAHX1WDNrnR9nhe75398HGbVwa37ez3edBzyMTHQIIHQI4dG9Tv8Pt5qH6CIfmy27I2O92LIN+jlNqc8lEhwBChwBChwB29GkZ4yWvy+682mdF73ScPktkokMAoUMAoUMAoUMAoUMAoUMAoUMA59FnVPP69V7LzpvDACY6BBA6BHDoPiP6HapXDThcdyTPACY6BBA6BBA6BLCjt2mMHxdlD2cUJjoEEDoEEDoEsKNP0hB3V+37kc0wJBMdAggdAjh0n6R+p9fcIYUWmegQQOgQQOgQwI4+Sb2n18Z4pxYYxESHAEKHAEKHAHb0GbWzln60lEtiGYWJDgGEDgGEDgHs6G0a57ny3pW9+XZX18kzgIkOAYQOARy6z4jmnViad27pfbzsri3NFcGZOBpMdAggdAggdAhgR59Rfe+eCkMy0SGA0CGA0CGAHX0edRuPey+ZdblsJBMdAggdAggdAtjRE/ReC29Hj2SiQwChQwCH7m1qfhLMMJ84M8rX9tM89eZK2wgmOgQQOgQQOgSwo09Sc++GCTHRIYDQIYDQIYAdfVrGeReXUSw0HrtEdi6Z6BBA6BDAofu0tHWJ67A/lwgmOgQQOgQQOgSwo8+KQbtznx2+eefVYe7y0n1w6dd2et+36lTb3DDRIYDQIYDQIYAdvU3NvXqYc9ijnFfvt6I3LnntdHyWVAITHQIIHQIIHQLY0SeppevZl50377d2OzceyUSHAEKHAEKHAEKHAEKHAEKHAE6vzajmW097DfM2VKgy0SGC0CGA0CGAHX1G9NvJqwbs5VZ2BjDRIYDQIYDQIYAdfZJ6P0pq2Les2sMZgYkOAYQOARy6t2mEO5fucqzOGJnoEEDoEEDoEMCO3qaWPvUVhmWiQwChQwChQwA7epv6nUe3vzNBJjoEEDoEcOjephEOz3fW0k+ccUksozDRIYDQIYDQIYAdfaXoXdmbp+32TPKFsBKZ6BBA6BBA6BDAjr5C9N7JZdldW5rn651yp8FEhwBChwBChwB29BnR926pw1poPHaePZ6JDgGEDgEcus+j5uk2h+7xTHQIIHQIIHQIYEdP0Dzd1sv+HsFEhwBChwBChwB29Db1u1NLU5t3bun3ve3oEUx0CCB0CCB0CCB0CCB0CCB0CCB0CCB0CCB0CCB0COAS2FnRvFx2iEtie+/iUvUKnyjb71JcnxgbwUSHAEKHAEKHAHb0WTXCzr7sbqq9e3hzB2/u6P3+LCuWiQ4BhA4BHLq3aZjD7SEO1Zun0wbqdwjeeK7b/c/37uwZ440fmSoTHQIIHQIIHQLY0WfFEPv8sktcm0ZYrTsde/k8MtEhgNAhgNAhgNAhgNAhgNAhgNAhgPPoM6rf9ewDz6NDg4kOAYQOARy6z4hBbz3te7juSJ4BTHQIIHQIIHQIYEdv0yif5NpkD2cEJjoEEDoEEDoEsKNPUu/OPmBf32UpZ4xMdAggdAggdAhgR2/TKOfNYYxMdAggdAjg0L1NzUtgezmsZ4JMdAggdAggdAhgR2/TCHv4zlr60VIuiWUUJjoEEDoEEDoEsKOvFL0re/P8/J5JvhBWIhMdAggdAjh0XyF67+Qy8CaLDuVpMNEhgNAhgNAhgB19Rgzcu/tpXmprR6fBRIcAQocAQocAdvR51G087r1k1v4eyUSHAEKHAEKHAHb0NjXfTjqtj3ju/bl29EgmOgQQOgRw6D5J/e7c0tTWYf5C47FD+QgmOgQQOgQQOgSwo8+KSZ1685bWSCY6BBA6BBA6BLCjT8u0LoclkokOAYQOAYQOAezo0zLouve2dvjmz3XtewQTHQIIHQI4dJ8DvXdarXqFu770+xTY5qE7c8lEhwBChwBChwB29Glp8xLYEW7Mynwy0SGA0CGA0CGAHb1NE3or6rLz5sPs6C55jWCiQwChQwChQwA7+grRez37sp0cBjDRIYDQIYBD9xnVfOspjMJEhwBChwBChwB29BkxaCfftdDnlJqzbQxgokMAoUMAoUMAO3qbmndFGeVtq3vO8u/wKpjoEEDoEMCh+yQNurFij13OmTFGJjoEEDoEEDoEsKO3aZjTaU6Z0SITHQIIHQIIHQLY0ds0zktgYQQmOgQQOgQQOgSwo09S784+aF9vfrKUS98ZgYkOAYQOARy6T9IQp9eanwq75MaKzdN2Lp9lABMdAggdAggdAtjR2zTETr5kB6/lO3rv4+afXcbOToOJDgGEDgGEDgHs6DNq4B7eq/m7ADs6DSY6BBA6BBA6BLCjz6PmW1x7r423v0cy0SGA0CGAQ/cEvaffHLpHMtEhgNAhgNAhgB29Tc2PfBrFuO7ystB4bGePYKJDAKFDAKFDADv6rGrrzqve0hrJRIcAQocADt3b1NbhNwzJRIcAQocAQocAdvQ2DXMJrH2eFpnoEEDoEEDoEMCOPisG7fN9dvjmnVeX3eWl3/f2ttUIJjoEEDoEEDoEsKPPinGeR+9zI9Zut3kbl8aX7hniLq6sGCY6BBA6BHDo3qYJXda67HRan6PvTseheSITHQIIHQIIHQIIHQIIHQIIHQIIHQI4jz6jmm897bXsvDkMYKJDAKFDAKFDADv6jOi3k1cN2Mut7AxgokMAoUMAh+5tan766ihvW3V4zghMdAggdAggdAhgR5+kIe6uustSzhiZ6BBA6BBA6BDAjj5J/c6ju4spLTLRIYDQIYBD90nqPb02obu4QJWJDhGEDgGEDgHs6DNqZy39xBmXxDIKEx0CCB0CCB0C2NHbNM5z5b0re/Ptri6fZQATHQIIHQIIHQLY0WdE804szTu39D5edteW5u8CnHKnwUSHAEKHAA7dZ1TfmyrCkEx0CCB0CCB0CGBHn0fdxmPrfjwTHQIIHQIIHQLY0RMs9HnOW1wjmOgQQOgQQOgQwI6ewF1c45noEEDoEMCh+yQ1P721H3dbZYxMdAggdAggdAhgR29Tv518Wjv4ML8nYG6Y6BBA6BBA6BDAjj4tg3bltnZ4l7xGMtEhgNAhgEP3WdU8tO9zKN+8IeOyu7z4FNh4JjoEEDoEEDoEsKPPinGeTrOT02CiQwChQwChQwA7ept8HBQzwkSHAEKHAEKHAHb0OeDadgYx0SGA0CGA0CGA0CGA0CGA0CGA02szovlxUP04ncawTHQIIHQIIHQIYEdfIXb1LuJ2coZkokMAoUMAoUMAO3qbhritUtMuizhjZKJDAKFDAIfubfIpsMwIEx0CCB0CCB0CCB0CCB0CCB0CCB0COI8+o3bW0o+WckksozDRIYDQIYBD9xWi91Dep8AyLBMdAggdAggdAtjR58FC4/GeqbwKZpiJDgGEDgGEDgHs6DNi2bnxht67rTbvvLrsa+3oNJjoEEDoEEDoEMCOvkIM2uGhHxMdAggdAjh0nwPLTrd53yoNJjoEEDoEEDoEEDoEEDoEEDoEEDoEcB59WrY3Hj844Pl+fxYGMNEhgNAhgNAhgB29Tf327FH+LAzJRIcAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAQocAa6b9AmhBt/G4M5VXwQwx0SGA0CGAQ/dJerDPc9tf+9fu6i49Nt/ZWXrsvsuxezwTHQIIHQIIHQLY0dvUbycf5c8Oq3dlt65HMtEhgNAhgNAhgB19DjXPq4OJDgGEDgGEDgHs6Gm8hTWSiQ4BhA4BhA4BhA4BhA4BhA4BnF5L53RbBBMdAggdAggdAggdAggdAggdAji9xlI+MXYumegQQOgQQOgQQOgQQOgQQOgQQOgQwHl0zm6h8XjPVF4FY2CiQwChQwChQwA7Omf3YOOxHX3FMtEhgNAhgEN3Xj2fGLtimegQQOgQQOgQwI7Oa+cS2RXDRIcAQocAQocAdnReu+Ylsr2PnWOfKSY6BBA6BBA6BLCjt2l743Fzp51Fzdfca5jX77r4mWKiQwChQwCH7m1a6Yfq4+Ry2aky0SGA0CGA0CGAHZ3J6He5bJXTby0z0SGA0CGA0CGAHT3drJzrb14ym+S29n+EiQ4BhA4BHLozETs7ycfm/Z28tf1jdxMdAggdAggdAtjRp2WUt4eOcErMrpzJRIcAQocAQocAdvRJauljm+zd/3HPCF97x4Dv1Xx+mJ/b72snwUSHAEKHAEKHAHb0VjV255beErrLir5o15S+1yg/dwKXupvokEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEEDoEGCqnwJ7/TPP1JbbJvARmDDDnnnmmdZ/Rqfb7fqwYJhzDt0hgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNAhgNCn5O67765Op7Pkn1WrVtW6detq8+bN9e53v7tuueWW2rdvX508eXLaL/c1++1vf1v33XdfffzjH6+tW7fWeeedV51Op7Zs2TLtlxZlzbRfAFUbN25c/PcTJ07U3/72tzpw4ED98pe/rC9/+cu1fv36+sIXvlA7duyoTqczxVc6vBtuuKGeffbZab+MeEKfAYcOHVry+PTp0/XEE0/Uo48+Wvfee289/fTT9alPfar2799f3/jGN1ZU7Oeee269/e1vr61bt9bWrVvrV7/6VT388MPTfllxhD6DVq9eXVdccUVdccUVtWPHjlpYWKhvfetb9c1vfrPe+ta31p133jntl/iqPfnkk7V69erFx0eOHJniq8llR59xr3vd6+rrX/96veMd76iqqnvuuaeef/75JX/mzJkz9fOf/7zuuOOOuuqqq2rz5s117rnn1vr16+u9731v7d69u06dOrXse+/evbs6nU6tX7++/vnPf571NZw5c6a2bNlSnU6n7r777qFef2/kTFGXqbjrrru6VdV9tf8TfOc731n883v27Fny3NNPP734XFV116xZ0123bt2S//ae97yne/z48SVfd+zYse6FF17Yraruww8/fNaf/f3vf79bVd3Vq1d3//KXvwz/l+3x8t/7sssuG+n7MBwTfYX4wAc+sDgdf/rTny55bs2aNfXhD3+4vv3tb9eBAwfqX//6V/3jH/+oY8eO1d69e2vTpk31s5/9rD772c8u+boLLrigPvrRj1ZV1QMPPHDWn/3yc9dee21deuml4/xrMSnT/n+aVMNO9G6327388su7VdW9+uqrh/pZv/nNb7pV1V27dm33xIkTS557/PHHF1/Hk08+uexrDx061D3nnHO6VdX93ve+N9TPfSUm+nSY6CvIxRdfXFW1bEcf5Morr6w3vvGN9eKLL9bvf//7Jc+97W1vq3e9611V9cpTfe/evXXq1KnavHlzffCDH3yNr5xpE/oK0u12z/rcyZMna/fu3fX+97+/Nm3aVOeff/6Si3EOHz5cVVV//etfl33tjh07qqrqoYceWnJxTrfbrT179lRV1cLCgl+srWBCX0H+/ve/V1XV+vXrl/z3w4cP15VXXlk333xzPfroo3Xw4MHqdDq1YcOG2rhxY23cuLFWrfr3/9Qvvvjisu+7bdu2uvjii+vo0aP1yCOPLP73H//4x/XUU0/V6tWra2FhocW/GW0T+grxwgsv1J///Oeqqnrzm9+85Llbb721/vCHP9T69evrq1/9ah08eLBOnDhRR44cqUOHDtWhQ4dq06ZNVfXKRwXnn39+3XTTTVVV9ZWvfGXxv/sl3PwQ+grxgx/8oE6fPl1VVddcc83ifz916tTiFL733nvrYx/7WF1yySVLvvb06dN19OjRvt//5ctrf/KTn9RTTz1VR48ere9+97tVVfXJT35yjH8TpsGVcSvAyZMn64tf/GJVVb3+9a+v6667bvG5I0eOLF7s8vJFNU379+/ve0FMVdXll19e73vf++pHP/pRPfDAA7Vx48Y6efJkbd68ua699tox/U2YFhN9xp04caJuuumm+t3vfldVVXfeeWdddNFFi8+vW7du8dr3xx9/fNnXv/TSS8vOn5/Ny7+U+9rXvrZ4CL99+3a/hJsDJvoMOnPmTD3xxBP1wx/+cPFNLVVVN954Y33mM59Z8mcvuOCCuvrqq2v//v1122231YYNG+qaa66pVatW1R//+Me67bbb6rHHHqu1a9e+4i/iel133XX1pje9qQ4ePFiHDx8eyy/hjh8/XsePH1/y+OW/Y3Od2LBhw0g/iz6mfB4/Vu8FMxs3blz856KLLuquWrVqyeWrGzZs6O7evfus3+uxxx7rrl27dvHPn3feeYuXtq5Zs6b70EMPdS+77LJuVXX37t3b93V97nOfW/w+H/rQh8b69xz0D+1x6D4DnnvuuXruuefq8OHD9dJLL9Ull1xSV111Vd188821b9++OnDgQN9fiL3zne+sX//617Vt27basGFDnTlzpi688MLatm1b/eIXv6gbb7zxVb+Wj3zkI4v/7pdw86PT7fa5CoM4X/rSl+r222+vzZs31zPPPGM/nxMmOotOnz5d9913X1VVfeITnxD5HBE6VfXvX47ddddd9ac//anWrl27+Bt45oPfuofbt29f3X777fX888/XsWPHqqrq85//fL3hDW+Y8itjnIQe7oUXXqhnn322zjnnnHrLW95Sn/70p+uWW26Z9stizPwyDgLY0SGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CGA0CHA/wN7WU25Nd597gAAAABJRU5ErkJggg=="

          
        ]
      });
    }, 1000);
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


module.exports = router;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function search(name, pass) { // 檢查登入資訊
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `user` WHERE username= ?', [name], async (err, result) => {
      if (err) throw err;
      console.log(result[0]);
      if (result[0].username == name && result[0].password == pass) {
        resolve({
          truth: true,
          index: result[0].index
        });
      }
      else {
        resolve({
          truth: false
        });
      }
    });
  });
}

async function duplicate(ID) {// 檢查Login log是否有重複登入紀錄
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `login_log` WHERE userID = ?', [ID], async (err, result) => {
      if (err) throw err;
      if (!result.length || !result[result.length - 1].valid) {// 若資料庫回傳空陣列，或是該使用者的最後登入紀錄的valid值為0
        resolve({
          truth: false
        });
      }
      else {
        resolve({
          truth: true,
          token: result[result.length - 1].Token
        });
      }


    });
  });
}

async function newlog(token, user, device, index) {// 新增登入資訊
  return new Promise((resolve, reject) => {
    connection.query('INSERT INTO `login_log` (`TID`, `Token`, `userID`, `Ctime`, `Utime`, `device_ID`, `valid`, `userindex`) VALUES (NULL, ?, ?, ?, ?, ?, 1, ?)', [token, user, new Date(), new Date(), device, index], (err, result) => {
      if (err) throw err;
      console.log(`insert`);
      resolve();
    });
  });
}
 
async function logout(token) {// 登出
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `login_log` SET `valid` = 0 WHERE `login_log`.`Token` = ?', [token], (err, result) => {
      if (err) throw err;
      resolve();
    });
  });
}

async function userprofile(ID) {// return user profile
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `user` WHERE `index` = ?', [ID], (err, result) => {
      if (err) throw err;
      resolve({
        code: 200,
        name: result[0].name,
        gender: result[0].gender,
        birthday: result[0].birthday,
        photo: result[0].photo
      });
    });
  });
}

async function updateprofile(obj, ID) {// update user profile
  return new Promise(async (resolve, reject) => {
    let count = 0;
    if (obj.name) {
      count += await update_name(obj.name, ID);
    }
    if (obj.password) {
      count += await update_passwod(obj.password, ID);
    }
    if (obj.gender) {
      count += await update_gender(obj.gender, ID);
    }
    if (obj.birthday) {
      count += await update_birthday(obj.birthday, ID);
    }
    if (obj.photo) {
      count += await update_photo(obj.photo, ID);
    }
    resolve({
      code: 200,
      update_success_count: count
    });
  });
}

async function update_name(name, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `name` = ? WHERE `user`.`index` = ?', [name, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_passwod(password, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET password = ? WHERE `user`.`index` = ?', [password, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_gender(gender, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `gender` = ? WHERE `user`.`index` = ?', [gender, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_birthday(birthday, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `birthday` = ? WHERE `user`.`index` = ?', [birthday, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_photo(photo, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `photo` = ? WHERE `user`.`index` = ?', [photo, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  })
}

async function update_Utime() {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `photo` = ? WHERE `user`.`index` = ?', [photo, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  })
}

async function notification() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `notification`', (err, result) => {
      if (err) throw err;
      resolve(result);
    });
  });
}

async function board() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `topic`', (err, result) => {
      if (err) throw err;
      resolve(result);
    });
  });
}

async function getpasi(ID) {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `pasi` WHERE `pasi`.`ID` = ?', [ID], (err, result) => {
      if (err) throw err;
      result.forEach((temp) => {
        
        temp.head = JSON.parse(temp.head);
        temp.upper = JSON.parse(temp.upper);
        temp.lower = JSON.parse(temp.lower);
        temp.body = JSON.parse(temp.body);
      });
      resolve(result);
    });
  });
}

async function addpasi(body, ID) {
  return new Promise((resolve, reject) => {
    connection.query('INSERT INTO `pasi` (`index`, `createdAt`, `head`, `upper`, `lower`, `body`, `ID`) VALUES (NULL, ?, ?, ?, ?, ?, ?)', [new Date().toISOString(), JSON.stringify(body.head), JSON.stringify(body.upper), JSON.stringify(body.lower), JSON.stringify(body.body), ID], (err, result) => {
      if (err) throw err;
      console.log(`pasi added`);
      resolve({
        code: 200,
        update_success_count: 1
      });
    });
  });
}

async function deletepasi(index, userID) {
  return new Promise(async (resolve, reject) => {
    let temp = await pasi_checkuser(index, userID);
    if (temp.truth) {
      resolve(await pasi_deletion(index));
    }
    else {
      resolve({ code: 403 });
    }
  });
}

async function putpasi(index, userID, body) {
  return new Promise(async (resolve, reject) => {
    let temp = await pasi_checkuser(index, userID);
    if (temp.truth) {
      resolve(await pasi_put(index, body));
    }
    else {
      resolve({ code: 403 });//おぼえます
    }
  });
}

async function pasi_checkuser(index, userID) {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `pasi` WHERE `pasi`.`index` = ?', [index], (err, result) => {
      if (err) throw err;
      if (!result.length || result[0].ID != userID) {
        resolve({
          truth: false
        });
      }
      else {
        resolve({
          truth: true
        });
      }
    });
  });
}

async function pasi_deletion(index) {
  return new Promise((resolve, reject) => {
    connection.query('DELETE FROM `pasi` WHERE `pasi`.`index` = ?', [index], (err, result) => {
      if (err) throw err;
      resolve({
        code: 200,
        update_success_count: 1
      });
    });
  });
}

async function pasi_put(index, body) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `pasi` SET `head` = ?, `upper` = ?, `lower` = ?, `body` = ? WHERE `pasi`.`index` = ?', [JSON.stringify(body.head), JSON.stringify(body.upper), JSON.stringify(body.lower), JSON.stringify(body.body), index], (err, result) => {
      if(err) throw err;
      resolve({
        code: 200,
        update_success_count: 5
      })
    });
  });
}


//'INSERT INTO `login_log` (`TID`, `Token`, `userID`, `Ctime`, `Utime`, `device_ID`, `valid`, `userindex`) VALUES (NULL, ?, ?, ?, ?, ?, 1, ?)