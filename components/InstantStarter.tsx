"use client";

import { id } from "@instantdb/react";
import { useState } from "react";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import { db, hasInstantConfig } from "@/lib/db";

export default function InstantStarter() {
  if (!hasInstantConfig || !db) {
    return (
      <Card className="gap-3 p-4">
        <h2 className="font-medium text-grayscale-12">InstantDB</h2>
        <p className="text-sm leading-6 text-grayscale-11">
          Add <span className="font-mono">NEXT_PUBLIC_INSTANT_APP_ID</span> to
          your local env, then run the app to enable the realtime starter list.
        </p>
      </Card>
    );
  }

  return <ConnectedInstantStarter database={db} />;
}

function ConnectedInstantStarter({
  database,
}: {
  database: NonNullable<typeof db>;
}) {
  const [text, setText] = useState("");
  const { data, error, isLoading } = database.useQuery({ todos: {} });
  const todos = data?.todos ?? [];

  async function addTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    await database.transact(
      database.tx.todos[id()].create({
        text: trimmedText,
        done: false,
        createdAt: Date.now(),
      }),
    );
    setText("");
  }

  return (
    <Card className="gap-4 p-4">
      <div>
        <h2 className="font-medium text-grayscale-12">InstantDB</h2>
        <p className="text-sm text-grayscale-11">
          Realtime todos are wired in.
        </p>
      </div>

      <form className="flex gap-2" onSubmit={addTodo}>
        <input
          className="min-w-0 flex-1 rounded-lg border border-grayscale-5 bg-grayscale-1 px-2 py-1 text-sm text-grayscale-12 outline-none transition-colors placeholder:text-grayscale-9 focus:border-accent-8"
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a todo"
          value={text}
        />
        <Button type="submit">Add</Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-grayscale-10">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-11">{error.message}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todos.map((todo) => (
            <li
              className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-11"
              key={todo.id}
            >
              {todo.text}
            </li>
          ))}
          {todos.length === 0 ? (
            <li className="rounded-lg border border-dashed border-grayscale-5 px-3 py-2 text-sm text-grayscale-10">
              No todos yet.
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}
