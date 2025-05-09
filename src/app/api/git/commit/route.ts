import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { commitMessage } = await request.json();

    if (!commitMessage) {
      return NextResponse.json({ error: 'Commit message is required' }, { status: 400 });
    }

    // Execute git add .
    try {
      const { stdout: addStdout, stderr: addStderr } = await execAsync('git add .');
      console.log(`git add . stdout: ${addStdout}`);
      if (addStderr) {
        console.error(`git add . stderr: ${addStderr}`);
        // Note: Sometimes git add . outputs to stderr even on success.
        // We'll proceed with the commit but log the stderr.
      }
    } catch (addError: any) {
      console.error(`Error during git add .: ${addError.message}`);
      return NextResponse.json({ error: `Failed to stage changes: ${addError.message}` }, { status: 500 });
    }


    // Execute git commit
    try {
      const { stdout: commitStdout, stderr: commitStderr } = await execAsync(`git commit -m "${commitMessage}"`);
      console.log(`git commit stdout: ${commitStdout}`);
      if (commitStderr) {
        console.error(`git commit stderr: ${commitStderr}`);
      }
      return NextResponse.json({ success: true, addOutput: "Changes staged.", commitOutput: commitStdout + commitStderr });
    } catch (commitError: any) {
        console.error(`Error during git commit: ${commitError.message}`);
         // Check if the error is due to no changes to commit
        if (commitError.message.includes('nothing to commit')) {
             return NextResponse.json({ success: false, message: 'No changes to commit.' }, { status: 200 });
        }
        return NextResponse.json({ error: `Failed to commit changes: ${commitError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`Request error: ${error.message}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}