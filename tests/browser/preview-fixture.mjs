/** Select one disposable native account, never a production release override. */
import { execFileSync } from 'node:child_process'
export function selectWorkspacePreview(email) {
  if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test' || !email.endsWith('@example.invalid')) throw Error('Disposable preview identity required')
  const env = { ...process.env }
  for (const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[key]
  const args=['tests/workspace-preview/fixture.php','select',email]
  if (process.env.CSSV_TEST_PHP_CONTAINER) execFileSync('docker', ['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args], {env,stdio:'pipe'})
  else execFileSync('php',args,{env,stdio:'pipe'})
}
