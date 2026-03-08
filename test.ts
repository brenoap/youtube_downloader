async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=wxjG5WtJQEM');
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
