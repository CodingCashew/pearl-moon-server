export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const order = req.body;
  console.log('New order received:', order);

  res.status(200).send('OK');
}