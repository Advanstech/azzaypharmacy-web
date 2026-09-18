import ClientPage from './ClientPage';

export async function generateStaticParams() { return [{ id: '1' }]; }

export default function Page(props: any) { return (
    // @ts-ignore
    <ClientPage params={props.params} />
  ); }
