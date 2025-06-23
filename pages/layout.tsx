const {
    data : { session },
} = await supabase.auth.getSession();

const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // ログイン画面へリダイレクトなど
}