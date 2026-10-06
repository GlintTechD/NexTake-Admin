import { Search, ArrowUpRight } from "lucide-react";
import Nav from "./Nav";
import Footer from "./Footer";


interface Post {
  category: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  avatar: string;
  image: string;
}

const posts: Post[] = [
  {
    category: "Design",
    title: "UX review presentations",
    excerpt:
      "How do you create compelling presentations that wow your colleagues and impress your managers?",
    author: "Olivia Rhye",
    date: "20 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=5",
    image:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&h=400&fit=crop",
  },
  {
    category: "Product",
    title: "Migrating to Linear 101",
    excerpt:
      "Linear helps streamline software projects, sprints, tasks, and bug tracking. Here's how to get started.",
    author: "Phoenix Baker",
    date: "19 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=12",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
  },
  {
    category: "Software Engineering",
    title: "Building your API Stack",
    excerpt:
      "The rise of RESTful APIs has been met by a rise in tools for creating, testing, and managing them.",
    author: "Lana Steiner",
    date: "18 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=32",
    image:
      "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&h=400&fit=crop",
  },
  {
    category: "Management",
    title: "Bill Walsh leadership lessons",
    excerpt:
      "Like to know the secrets of transforming a 2-14 team into a 3x Super Bowl winning Dynasty?",
    author: "Alec Whitten",
    date: "17 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=51",
    image:
      "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&h=400&fit=crop",
  },
  {
    category: "Product",
    title: "PM mental models",
    excerpt:
      "Mental models are simple expressions of complex processes or relationships.",
    author: "Demi Wilkinson",
    date: "16 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=44",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
  },
  {
    category: "Design",
    title: "What is Wireframing?",
    excerpt:
      "Introduction to Wireframing and its Principles. Learn from the best in the industry.",
    author: "Candice Wu",
    date: "15 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=47",
    image:
      "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&h=400&fit=crop",
  },
  {
    category: "Design",
    title: "How collaboration makes us better designers",
    excerpt:
      "Collaboration can make our teams stronger, and our individual designs better.",
    author: "Natali Craig",
    date: "14 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=26",
    image:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=400&fit=crop",
  },
  {
    category: "Product",
    title: "Our top 10 Javascript frameworks to use",
    excerpt:
      "JavaScript frameworks make development easy with extensive features and functionalities.",
    author: "Drew Cano",
    date: "13 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=13",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop",
  },
  {
    category: "Customer Success",
    title: "Podcast: Creating a better CX Community",
    excerpt: "Starting a community doesn't need to be complicated, but how do you get started?",
    author: "Orlando Diggs",
    date: "12 Jan 2022",
    avatar: "https://i.pravatar.cc/64?img=68",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
  },
];

function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex flex-col rounded-2xl bg-white overflow-hidden">
      <div className="aspect-[3/2] w-full overflow-hidden rounded-2xl">
        <img
          src={post.image}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-3 pt-5">
        <span className="text-sm font-semibold text-violet-600">
          {post.category}
        </span>
        <a href="#" className="group flex items-start gap-2">
          <h3 className="text-lg font-semibold text-slate-900 leading-snug">
            {post.title}
          </h3>
          <ArrowUpRight
            className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-900"
            strokeWidth={2}
          />
        </a>
        <p className="text-sm leading-relaxed text-slate-500">
          {post.excerpt}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="text-sm">
            <div className="font-medium text-slate-900">{post.author}</div>
            <div className="text-slate-500">{post.date}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-violet-50">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(237,233,254,1) 0%, rgba(237,233,254,1) 55%, rgba(255,255,255,0) 100%)",
          }}
        />
        {/* decorative diagonal bands */}
        <div className="pointer-events-none absolute -left-24 bottom-0 h-24 w-72 -rotate-6 bg-violet-300/60" />
        <div className="pointer-events-none absolute -right-24 top-24 h-16 w-96 -rotate-3 bg-violet-300/50" />


         
        <Nav />

        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <span className="inline-block rounded-full bg-white px-4 py-1.5 text-sm font-medium text-violet-700 shadow-sm">
            Our blog
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Resources and insights
          </h1>
          <p className="mt-4 text-lg text-violet-700">
            The latest industry news, interviews, technologies, and resources.
          </p>

          <div className="mx-auto mt-8 max-w-xs">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:pt-16">
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.title} post={post} />
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <button className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100">
            <span aria-hidden>↓</span>
            Load more
          </button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
