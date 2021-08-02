/**
 * SFDC Webhook Sample
 */

require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const admZip = require('adm-zip');
const sf = require('./salesforce');

exports.exampleSfdcWebhookSendImage = async (req, res) => {

  // check by webhookKey
  if (req.body.webhookKey) {

    if (req.body.webhookKey !== process.env.SPALO_WEBHOOK_KEY) {
      console.log('webhookKey Error');
      return res.status(401).send('Unauthorized')
    }

  } else {

    // for verification
    return res.send('OK')

  }

  // endpoint
  const spalo_login_url = 'https://maker.spalo.jp/api/v2/user/login';
  const spalo_download_url = 'https://maker.spalo.jp/api/v2/history/download/image/';

  const params1 = {
    workspaceCode: 'xxxx',
    email: 'xxxx',
    password: 'xxxx',
  };

  let links = [];
  let conn;
  try {
    // SPALOログイン
    const res1 = await axios.post(spalo_login_url, params1);
    const config = {
      headers: {
        Authorization: 'Bearer ' + res1.data.accessToken,
        ContentType: 'application/octet-stream',
      },
      responseType: 'arraybuffer',
    }
    // 送信画像取得
    const res2 = await axios.get(spalo_download_url + req.body.historyId, config);
    const contentMeta = res2.headers['content-disposition'].split('=');
    const fileName = contentMeta[1];
    // Salesforceログイン
    conn = await sf.getConnection();
    // ドメイン抽出
    const domain = conn.instanceUrl.substring(8, conn.instanceUrl.indexOf('.my'));
    // CloudFunction利用可能一時ディレクトリ
    const outputDir = '/tmp/';
    // 一時ファイル出力
    fs.writeFileSync(outputDir + fileName, res2.data, 'binary');
    // adm-zipのインスタンス生成
    const zip = new admZip(outputDir + fileName);
    for (const zipEntry of zip.getEntries()) {
      // ファイル解凍
      fs.writeFileSync(outputDir + zipEntry.name, zipEntry.getData(), 'binary')
      // ファイル読み込み
      const file = fs.createReadStream(outputDir + zipEntry.name);
      // ファイルアップロード
      const fileId = await sf.uploadImage(conn, file);
      // ファイルプレビューURL作成
      const fileViewUrl = 'https://' + domain + '.lightning.force.com/lightning/r/ContentDocument/' + fileId + '/view'
      links.push(fileViewUrl);
      // ファイル削除
      fs.unlink(outputDir + zipEntry.name, (err) => {
        if (err) throw err;
        console.log('削除しました。' + zipEntry.name);
      });
    }
    fs.unlink(outputDir + fileName, (err) => {
      if (err) throw err;
      console.log('削除しました。' + fileName);
    });
  } catch (err) {
    console.dir(err);
    const errorMessage = err.response;
    console.log(errorMessage);
  }

  // data setting.
  const historyId = req.body.historyId;
  const date = req.body.data['作業日'];
  const dm = date.match(/(\d+)年(\d+)月(\d+)日/);
  const working_date = dm[1] + '-' + dm[2] + '-' + dm[3];
  const worker = req.body.data['作業者'];
  const site_name = req.body.data['現場名'];
  const remarks = req.body.data['備考'];
  // postdata
  const insert_data = {
    history_id__c: historyId,
    working_date__c: working_date,
    site_name__c: site_name,
    worker__c: worker,
    photo__c: links[0],
    remarks__c: remarks,
  };
  // カスタムオブジェクト登録
  await sf.insertObject(conn, insert_data);

};
