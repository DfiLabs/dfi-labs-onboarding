import jwt from 'jsonwebtoken';

const secret = process.env.INVITE_SECRET || 'CHANGE_ME';
const email = process.argv[2];
if(!email){
  console.error('Usage: node tools/generate-invite.ts user@example.com');
  process.exit(1);
}
const token = jwt.sign({ email }, secret, { expiresIn: '30d' });
console.log(token);
